package service

import (
	"context"
	"fmt"
	"sort"
	
	"github.com/joaoleau/floslo/internal/config/logger"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3vectors"
	"github.com/aws/aws-sdk-go-v2/service/s3vectors/document"
	"github.com/aws/aws-sdk-go-v2/service/s3vectors/types"
)

// deleteVectorsBatchSize caps each DeleteVectors call to stay within the S3 Vectors API limit per request.
const deleteVectorsBatchSize = 500

type RetrievedChunk struct {
	Content    string
	Score      float64
	ObjectKey  string
	Page       int
	ChunkIndex int
	Language   string
}

type VectorService struct {
	Client *s3vectors.Client
	EmbeddingService *EmbeddingService
	VectorBucket string
	VectorIndex  string
}

type VectorMetadata struct {
	User 	string `json:"user"`
	ObjectKey  string `json:"object_key"`
	Language   string `json:"language"`
	Chunk      string `json:"chunk"`
	Page       int    `json:"page"`
	ChunkIndex int    `json:"chunk_index"`
}

func NewVectorService(client *s3vectors.Client, embeddingService *EmbeddingService, vectorBucket string, vectorIndex string) *VectorService {
	return &VectorService{
		Client: client,
		EmbeddingService: embeddingService,
		VectorBucket: vectorBucket,
		VectorIndex:  vectorIndex,
	}
}

func (s *VectorService) RetrieveRelevantChunks(ctx context.Context, userId string, objectKey string, query string, topK int32, language string) ([]RetrievedChunk, error) {
	embedding, err := s.EmbeddingService.GenerateEmbedding(ctx, query)

	if err != nil {
		return nil, err
	}

	vectors, err := s.QueryVectors(ctx, userId, objectKey, embedding, topK, language)
	if err != nil {
		return nil, err
	}

	return s.sortAndBuildChunks(vectors)
}

// RetrieveRelevantChunksMulti runs one real vector search per query (e.g. one per tag)
// instead of a single search over a combined query -- this bounds the blast radius of any
// one bad/generic tag: even if one query returns weak matches, the others still anchor the
// context on genuinely different parts of the document. Results are merged (deduplicated by
// page+chunk_index) and re-sorted by distance. A failure on one query is logged and skipped,
// not fatal -- only fails if every query fails.
//
// language, when non-empty, restricts the search to chunks tagged with that language
// (VectorMetadata.language, set at ingestion time by the processor). Pass "" for no filter --
// see RetrieveRelevantChunksMultiForLanguage for the caller-facing version with fallback.
func (s *VectorService) RetrieveRelevantChunksMulti(ctx context.Context, userId string, objectKey string, queries []string, perQueryTopK int32, language string) ([]RetrievedChunk, error) {
	type chunkKey struct {
		page       int
		chunkIndex int
	}

	seen := make(map[chunkKey]bool)
	var merged []RetrievedChunk
	var lastErr error

	for _, query := range queries {
		chunks, err := s.RetrieveRelevantChunks(ctx, userId, objectKey, query, perQueryTopK, language)
		if err != nil {
			lastErr = err
			logger.Log.Error("failed retrieving chunks for one of the multi-tag queries, skipping it", logger.String("query", query), logger.Any("error", err))
			continue
		}

		for _, chunk := range chunks {
			key := chunkKey{page: chunk.Page, chunkIndex: chunk.ChunkIndex}
			if seen[key] {
				continue
			}
			seen[key] = true
			merged = append(merged, chunk)
		}
	}

	if len(merged) == 0 {
		if lastErr != nil {
			return nil, fmt.Errorf("all multi-tag queries failed: %w", lastErr)
		}
		return merged, nil
	}

	sort.Slice(merged, func(i, j int) bool {
		return merged[i].Score < merged[j].Score
	})

	return merged, nil
}

// RetrieveRelevantChunksMultiForLanguage biases retrieval towards chunks tagged with the
// requested language, falling back to an unfiltered search when nothing matches (e.g. no
// ingested content has been detected in that language yet) so a challenger's language choice
// never hard-fails content generation -- GenerationService still gets a language instruction
// either way and translates when the fallback kicks in.
func (s *VectorService) RetrieveRelevantChunksMultiForLanguage(ctx context.Context, userId string, objectKey string, queries []string, perQueryTopK int32, language string) ([]RetrievedChunk, error) {
	if language == "" {
		return s.RetrieveRelevantChunksMulti(ctx, userId, objectKey, queries, perQueryTopK, "")
	}

	chunks, err := s.RetrieveRelevantChunksMulti(ctx, userId, objectKey, queries, perQueryTopK, language)
	if err == nil && len(chunks) > 0 {
		return chunks, nil
	}

	logger.Log.Info(
		"no chunks matched the requested language, falling back to unfiltered retrieval",
		logger.String("language", language),
	)
	return s.RetrieveRelevantChunksMulti(ctx, userId, objectKey, queries, perQueryTopK, "")
}

func (s *VectorService) sortAndBuildChunks(vectors []types.QueryOutputVector) ([]RetrievedChunk, error) {
	var chunks []RetrievedChunk
	
	for _, vector := range vectors {
		metadata, err := s.getVectorMetadata(&vector)
		if err != nil {
			return nil, err
		}

		logger.Log.Info(
			"retrieved vector metadata",
			logger.String("user", metadata.User),
			logger.String("object_key", metadata.ObjectKey),
			logger.Any("page", metadata.Page),
			logger.Any("chunk_index", metadata.ChunkIndex),
			logger.String("language", metadata.Language),
		)
		
		chunks = append(chunks, RetrievedChunk{
			Content:    metadata.Chunk,
			Score:      float64(*vector.Distance),
			ObjectKey:  metadata.ObjectKey,
			Page:       metadata.Page,
			ChunkIndex: metadata.ChunkIndex,
			Language:   metadata.Language,
		})
	}

	sort.Slice(chunks, func(i, j int) bool {
		return chunks[i].Score < chunks[j].Score
	})

	return chunks, nil
}

func (s *VectorService) getVectorMetadata(vector *types.QueryOutputVector) (*VectorMetadata, error) {
	if vector.Metadata == nil {
		return nil, fmt.Errorf("vector metadata is nil")
	}
	
	var metadata VectorMetadata
	err := vector.Metadata.UnmarshalSmithyDocument(&metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal vector metadata: %w", err)
	}
	return &metadata, nil
}

func (s *VectorService) QueryVectors(ctx context.Context, userId string, objectKey string, embedding []float32, topK int32, language string) ([]types.QueryOutputVector, error) {
	logger.Log.Info(
		"starting query vectors",
		logger.String("user_id", userId),
		logger.Any("object_key", len(objectKey)),
		logger.Any("embedding_dimensions", len(embedding)),
		logger.Any("top_k", int(topK)),
		logger.String("language", language),
	)

	filterClauses := []map[string]interface{}{
		{
			"user": map[string]interface{}{
				"$eq": userId,
			},
		},
		{
			"object_key": map[string]interface{}{
				"$eq": objectKey,
			},
		},
	}
	if language != "" {
		filterClauses = append(filterClauses, map[string]interface{}{
			"language": map[string]interface{}{
				"$eq": language,
			},
		})
	}
	filter := map[string]interface{}{
		"$and": filterClauses,
	}
	output, err := s.Client.QueryVectors(
		ctx,
		&s3vectors.QueryVectorsInput{
			VectorBucketName: aws.String(s.VectorBucket),
			IndexName:        aws.String(s.VectorIndex),
			QueryVector: &types.VectorDataMemberFloat32{
				Value: embedding,
			},
			TopK:            aws.Int32(topK),
			ReturnMetadata:  true,
			ReturnDistance:  true,
			Filter:          document.NewLazyDocument(filter),
		},
	)

	if err != nil {
		logger.Log.Error(
			"failed querying vectors",
			logger.Any("error", err),
			logger.String("user_id", userId),
			logger.String("object_key", objectKey),
			logger.String("vector_bucket", s.VectorBucket),
			logger.String("vector_index", s.VectorIndex),
		)
		return nil, fmt.Errorf("failed querying vectors: %w", err)
	}

	logger.Log.Info("query vectors success",logger.String("object_key", objectKey),logger.Any("vectors_found", len(output.Vectors)))

	return output.Vectors, nil
}

// DeleteVectors deletes vectors by their exact keys (as returned by VectorSaveResult at
// ingestion time and persisted on the object record), batching requests to stay within
// the S3 Vectors DeleteVectors per-call limit. This is the primary, O(1)-lookup deletion
// path: no scan or search of the index is needed because the caller already knows exactly
// which keys belong to the object.
func (s *VectorService) DeleteVectors(ctx context.Context, keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	for i := 0; i < len(keys); i += deleteVectorsBatchSize {
		end := i + deleteVectorsBatchSize
		if end > len(keys) {
			end = len(keys)
		}

		_, err := s.Client.DeleteVectors(ctx, &s3vectors.DeleteVectorsInput{
			VectorBucketName: aws.String(s.VectorBucket),
			IndexName:        aws.String(s.VectorIndex),
			Keys:             keys[i:end],
		})
		if err != nil {
			logger.Log.Error("failed deleting vector batch", logger.Any("error", err), logger.Any("batch_size", end-i))
			return fmt.Errorf("failed deleting vectors: %w", err)
		}
	}

	logger.Log.Info("deleted vectors", logger.Any("count", len(keys)))
	return nil
}