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

const deleteVectorsBatchSize = 500

// getVectorsBatchSize é o limite de chaves por requisição do GetVectors.
const getVectorsBatchSize = 100

type RetrievedChunk struct {
	// Key é o id determinístico do vetor (vec_<objectId>_<page>_<chunkIndex>), que também
	// serve para achar os vizinhos de apoio.
	Key        string
	Content    string
	Score      float64
	ObjectKey  string
	Page       int
	ChunkIndex int
	// Language só identifica o idioma detectado do chunk; nenhuma busca filtra por ele.
	Language string
}

type VectorService struct {
	Client           *s3vectors.Client
	EmbeddingService *EmbeddingService
	VectorBucket     string
	VectorIndex      string
}

// Metadados gravados pelo processor em cada vetor (VectorMetadata em
// api/processor/services/vector.py). UnmarshalSmithyDocument lê a tag `document`, não a `json`:
// sem ela, o nome do campo é comparado sem diferenciar maiúsculas, e os nomes com sublinhado
// (object_key, chunk_index) nunca batiam, chegando sempre vazios ("" e 0).
type VectorMetadata struct {
	User       string `document:"user" json:"user"`
	ObjectKey  string `document:"object_key" json:"object_key"`
	Language   string `document:"language" json:"language"`
	Chunk      string `document:"chunk" json:"chunk"`
	Page       int    `document:"page" json:"page"`
	ChunkIndex int    `document:"chunk_index" json:"chunk_index"`
}

func NewVectorService(client *s3vectors.Client, embeddingService *EmbeddingService, vectorBucket string, vectorIndex string) *VectorService {
	return &VectorService{
		Client:           client,
		EmbeddingService: embeddingService,
		VectorBucket:     vectorBucket,
		VectorIndex:      vectorIndex,
	}
}

func (s *VectorService) RetrieveRelevantChunks(ctx context.Context, userId string, objectKey string, query string, topK int32) ([]RetrievedChunk, error) {
	embedding, err := s.EmbeddingService.GenerateEmbedding(ctx, query)

	if err != nil {
		return nil, err
	}

	vectors, err := s.QueryVectors(ctx, userId, objectKey, embedding, topK)
	if err != nil {
		return nil, err
	}

	return s.sortAndBuildChunks(vectors)
}

// GetChunksByKeys busca chunks diretamente pelo id do vetor, sem consulta de similaridade.
// Chaves que não existem no índice simplesmente não aparecem no resultado.
func (s *VectorService) GetChunksByKeys(ctx context.Context, keys []string) (map[string]RetrievedChunk, error) {
	chunks := make(map[string]RetrievedChunk, len(keys))

	for start := 0; start < len(keys); start += getVectorsBatchSize {
		end := min(start+getVectorsBatchSize, len(keys))

		output, err := s.Client.GetVectors(ctx, &s3vectors.GetVectorsInput{
			VectorBucketName: aws.String(s.VectorBucket),
			IndexName:        aws.String(s.VectorIndex),
			Keys:             keys[start:end],
			ReturnMetadata:   true,
		})
		if err != nil {
			logger.Log.Error("failed getting vectors by key", logger.Any("error", err), logger.Any("keys", end-start))
			return nil, fmt.Errorf("failed getting vectors by key: %w", err)
		}

		for _, vector := range output.Vectors {
			metadata, err := s.getVectorMetadata(vector.Metadata)
			if err != nil {
				return nil, err
			}

			key := aws.ToString(vector.Key)
			chunks[key] = RetrievedChunk{
				Key:        key,
				Content:    metadata.Chunk,
				ObjectKey:  metadata.ObjectKey,
				Page:       metadata.Page,
				ChunkIndex: metadata.ChunkIndex,
				Language:   metadata.Language,
			}
		}
	}

	return chunks, nil
}

func (s *VectorService) sortAndBuildChunks(vectors []types.QueryOutputVector) ([]RetrievedChunk, error) {
	var chunks []RetrievedChunk

	for _, vector := range vectors {
		metadata, err := s.getVectorMetadata(vector.Metadata)
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
			Key:        aws.ToString(vector.Key),
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

func (s *VectorService) getVectorMetadata(document document.Interface) (*VectorMetadata, error) {
	if document == nil {
		return nil, fmt.Errorf("vector metadata is nil")
	}

	var metadata VectorMetadata
	err := document.UnmarshalSmithyDocument(&metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal vector metadata: %w", err)
	}
	return &metadata, nil
}

func (s *VectorService) QueryVectors(ctx context.Context, userId string, objectKey string, embedding []float32, topK int32) ([]types.QueryOutputVector, error) {
	logger.Log.Info(
		"starting query vectors",
		logger.String("user_id", userId),
		logger.Any("object_key", len(objectKey)),
		logger.Any("embedding_dimensions", len(embedding)),
		logger.Any("top_k", int(topK)),
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
			TopK:           aws.Int32(topK),
			ReturnMetadata: true,
			ReturnDistance: true,
			Filter:         document.NewLazyDocument(filter),
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

	logger.Log.Info("query vectors success", logger.String("object_key", objectKey), logger.Any("vectors_found", len(output.Vectors)))

	return output.Vectors, nil
}

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
