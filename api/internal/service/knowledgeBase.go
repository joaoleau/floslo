package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/joaoleau/floslo/internal/config/logger"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagent"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagent/types"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime/document"
	runtimetypes "github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime/types"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

type KnowledgeBaseService struct {
	BedrockClient   *bedrockagent.Client
	RuntimeClient   *bedrockagentruntime.Client
	ModelClient     *bedrockruntime.Client
	StorageService  *StorageService
	KnowledgeBaseId string
	DataSourceId    string
	ModelId         string
}

func NewKnowledgeBaseService(
	bedrockClient *bedrockagent.Client,
	runtimeClient *bedrockagentruntime.Client,
	modelClient *bedrockruntime.Client,
	storageService *StorageService,
	knowledgeBaseId string,
	dataSourceId string,
	modelId string,
) *KnowledgeBaseService {

	return &KnowledgeBaseService{
		BedrockClient:   bedrockClient,
		RuntimeClient:   runtimeClient,
		ModelClient:     modelClient,
		StorageService:  storageService,
		KnowledgeBaseId: knowledgeBaseId,
		DataSourceId:    dataSourceId,
		ModelId:         modelId,
	}
}

type KnowledgeBaseRequest struct {
	Messages         []KnowledgeBaseMessage       `json:"messages"`
	InferenceConfig  KnowledgeBaseInferenceConfig `json:"inferenceConfig"`
}

type KnowledgeBaseMessage struct {
	Role    string                 `json:"role"`
	Content []KnowledgeBaseContent `json:"content"`
}

type KnowledgeBaseContent struct {
	Text string `json:"text"`
}

type KnowledgeBaseInferenceConfig struct {
	MaxNewTokens int     `json:"max_new_tokens"`
	Temperature  float64 `json:"temperature"`
	TopP         float64 `json:"top_p"`
}

type KnowledgeBaseResponse struct {
	Output KnowledgeBaseOutput `json:"output"`
}

type KnowledgeBaseOutput struct {
	Message KnowledgeBaseResponseMessage `json:"message"`
}

type KnowledgeBaseResponseMessage struct {
	Content []KnowledgeBaseResponseContent `json:"content"`
}

type KnowledgeBaseResponseContent struct {
	Text string `json:"text"`
}

type GeneratedQuiz struct {
	Question     string             `json:"question"`
	Alternatives []QuizAlternative  `json:"alternatives"`
	Explanation  string             `json:"explanation"`
	Difficulty   string             `json:"difficulty"`
	Tag          string             `json:"tag"`
	SourceChunks []SourceChunk      `json:"source_chunks"`
}

type SourceChunk struct {
	Content string  `json:"content"`
	Score   float64 `json:"score"`
}

type QuizAlternative struct {
	Id      string `json:"id"`
	Text    string `json:"text"`
	Correct bool   `json:"correct"`
}

func (s *KnowledgeBaseService) RetrieveAndGenerate(
	ctx context.Context,
	username string,
	schedulerId string,
	documentNames []string,
) (*GeneratedQuiz, error) {

	start := time.Now()

	logger.Log.Info(
		"starting retrieve and generate",
		logger.String("username", username),
		logger.String("scheduler_id", schedulerId),
	)

	tag := s.getRandomTag(
		ctx,
		username,
		documentNames,
	)

	if tag == "" {

		logger.Log.Error(
			"no tags found",
			logger.String("username", username),
			logger.String("scheduler_id", schedulerId),
		)

		return nil, fmt.Errorf("no tags found")
	}

	logger.Log.Info(
		"random tag selected",
		logger.String("tag", tag),
	)

	query := s.generateQuery(tag)

	logger.Log.Info(
		"semantic query generated",
		logger.String("query", query),
	)

	chunks, err := s.retrieveChunks(
		ctx,
		username,
		schedulerId,
		query,
		tag,
		7,
	)

	if err != nil {
		logger.Log.Error(
			"failed to retrieve chunks",
			logger.String("error", err.Error()),
		)

		return nil, err
	}

	logger.Log.Info(
		"chunks retrieved",
		logger.Any("count", len(chunks)),
	)

	if len(chunks) == 0 {

		logger.Log.Error(
			"no chunks returned from retrieve",
		)

		return nil, fmt.Errorf("no chunks found")
	}

	for index, chunk := range chunks {

		content := ""
		score := 0.0

		if chunk.Content != nil &&
			chunk.Content.Text != nil {

			content = *chunk.Content.Text
		}

		if chunk.Score != nil {
			score = *chunk.Score
		}

		logger.Log.Info(
			"retrieved chunk",
			logger.Any("index", index),
			logger.Any("score", score),
			logger.String(
				"content_preview",
				truncate(content, 300),
			),
		)
	}

	selectedChunks := s.diversifyChunks(chunks)

	logger.Log.Info(
		"chunks diversified",
		logger.Any("selected_count", len(selectedChunks)),
	)

	for index, chunk := range selectedChunks {

		content := ""
		score := 0.0

		if chunk.Content != nil &&
			chunk.Content.Text != nil {

			content = *chunk.Content.Text
		}

		if chunk.Score != nil {
			score = *chunk.Score
		}

		logger.Log.Info(
			"selected chunk",
			logger.Any("index", index),
			logger.Any("score", score),
			logger.String(
				"content_preview",
				truncate(content, 500),
			),
		)
	}

	contextText := s.buildContext(selectedChunks)

	logger.Log.Info(
		"context built",
		logger.Any("context_size", len(contextText)),
		logger.String(
			"context_preview",
			truncate(contextText, 1000),
		),
	)

	quiz, err := s.generate(
		ctx,
		query,
		tag,
		contextText,
	)

	if err != nil {

		logger.Log.Error(
			"failed to generate quiz",
			logger.String("error", err.Error()),
		)

		return nil, err
	}

	quiz.SourceChunks = s.buildSourceChunks(
		selectedChunks,
	)

	logger.Log.Info(
		"quiz generated successfully",
		logger.String("question", quiz.Question),
		logger.String("difficulty", quiz.Difficulty),
		logger.String("tag", quiz.Tag),
		logger.Any(
			"alternatives_count",
			len(quiz.Alternatives),
		),
		logger.Any(
			"duration_ms",
			time.Since(start).Milliseconds(),
		),
	)

	return quiz, nil
}

func (s *KnowledgeBaseService) generate(
	ctx context.Context,
	query string,
	tag string,
	contextText string,
) (*GeneratedQuiz, error) {

	prompt := fmt.Sprintf(`
You are an intelligent educational quiz generator.

Based ONLY on the provided context,
generate ONE multiple choice study question.

You MUST respond ONLY with valid JSON.

Required JSON schema:

{
  "question": "string",
  "alternatives": [
    {
      "id": "A",
      "text": "string",
      "correct": false
    },
    {
      "id": "B",
      "text": "string",
      "correct": false
    },
    {
      "id": "C",
      "text": "string",
      "correct": false
    },
    {
      "id": "D",
      "text": "string",
      "correct": false
    },
    {
      "id": "E",
      "text": "string",
      "correct": false
    }
  ],
  "explanation": "string",
  "difficulty": "easy|medium|hard",
  "tag": "string"
}

RULES:
- Exactly 5 alternatives
- Only ONE correct alternative
- Alternatives must be plausible
- Explanation must explain why the correct answer is correct
- Do not use markdown
- Do not explain outside JSON
- Output valid JSON only
- Use ONLY information from the provided context

CONTEXT:
%s

TOPIC:
%s
`, contextText, query)

	logger.Log.Info(
		"prompt generated",
		logger.String(
			"prompt_preview",
			truncate(prompt, 3000),
		),
	)

	body := KnowledgeBaseRequest{
		Messages: []KnowledgeBaseMessage{
			{
				Role: "user",
				Content: []KnowledgeBaseContent{
					{
						Text: prompt,
					},
				},
			},
		},
		InferenceConfig: KnowledgeBaseInferenceConfig{
			MaxNewTokens: 500,
			Temperature:  0.8,
			TopP:         0.9,
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {

		logger.Log.Error(
			"failed to marshal request body",
			logger.String("error", err.Error()),
		)

		return nil, err
	}

	logger.Log.Info(
		"invoking model",
		logger.String("model_id", s.ModelId),
		logger.Any(
			"max_new_tokens",
			body.InferenceConfig.MaxNewTokens,
		),
		logger.Any(
			"temperature",
			body.InferenceConfig.Temperature,
		),
		logger.Any(
			"top_p",
			body.InferenceConfig.TopP,
		),
	)

	output, err := s.ModelClient.InvokeModel(
		ctx,
		&bedrockruntime.InvokeModelInput{
			ModelId:     aws.String(s.ModelId),
			ContentType: aws.String("application/json"),
			Body:        payload,
		},
	)

	if err != nil {

		logger.Log.Error(
			"failed to invoke model",
			logger.String("error", err.Error()),
		)

		return nil, fmt.Errorf(
			"failed to invoke model: %w",
			err,
		)
	}

	logger.Log.Info(
		"raw model response received",
		logger.String(
			"response",
			truncate(string(output.Body), 5000),
		),
	)

	var response KnowledgeBaseResponse

	if err := json.Unmarshal(output.Body, &response); err != nil {

		logger.Log.Error(
			"failed to unmarshal model response",
			logger.String("error", err.Error()),
		)

		return nil, err
	}

	if len(response.Output.Message.Content) == 0 {

		logger.Log.Error(
			"empty model response content",
		)

		return nil, fmt.Errorf("empty model response")
	}

	rawText := response.Output.Message.Content[0].Text

	text := cleanJSONResponse(rawText)

	logger.Log.Info(
		"model generated text extracted",
		logger.String(
			"text",
			truncate(text, 5000),
		),
	)

	var generated GeneratedQuiz

	if err := json.Unmarshal(
		[]byte(text),
		&generated,
	); err != nil {

		logger.Log.Error(
			"failed to parse generated quiz json",
			logger.String("error", err.Error()),
			logger.String(
				"raw_text",
				truncate(text, 5000),
			),
		)

		return nil, fmt.Errorf(
			"failed to parse generated question json: %w",
			err,
		)
	}

	if generated.Tag == "" {
		generated.Tag = tag
	}

	correctAlternatives := 0

	for _, alt := range generated.Alternatives {

		if alt.Correct {
			correctAlternatives++
		}

		logger.Log.Info(
			"quiz alternative",
			logger.String("id", alt.Id),
			logger.Any("correct", alt.Correct),
			logger.String(
				"text",
				truncate(alt.Text, 300),
			),
		)
	}

	logger.Log.Info(
		"quiz validation",
		logger.Any(
			"correct_alternatives",
			correctAlternatives,
		),
		logger.Any(
			"alternatives_count",
			len(generated.Alternatives),
		),
	)

	if len(generated.Alternatives) != 5 {

		logger.Log.Error(
			"invalid alternatives count",
			logger.Any(
				"count",
				len(generated.Alternatives),
			),
		)

		return nil, fmt.Errorf(
			"quiz must contain exactly 5 alternatives",
		)
	}

	if correctAlternatives != 1 {

		logger.Log.Error(
			"invalid correct alternatives count",
			logger.Any(
				"count",
				correctAlternatives,
			),
		)

		return nil, fmt.Errorf(
			"quiz must contain exactly one correct alternative",
		)
	}

	logger.Log.Info(
		"quiz parsed successfully",
		logger.String(
			"question",
			generated.Question,
		),
		logger.String(
			"difficulty",
			generated.Difficulty,
		),
		logger.String(
			"tag",
			generated.Tag,
		),
	)

	return &generated, nil
}

func (s *KnowledgeBaseService) diversifyChunks(
	chunks []runtimetypes.KnowledgeBaseRetrievalResult,
) []runtimetypes.KnowledgeBaseRetrievalResult {

	logger.Log.Info(
		"diversifying chunks",
		logger.Any("input_count", len(chunks)),
	)

	if len(chunks) <= 5 {

		logger.Log.Info(
			"chunk count already small enough",
		)

		return chunks
	}

	selected := []runtimetypes.KnowledgeBaseRetrievalResult{
		chunks[0],
		chunks[1],
		chunks[2],
	}

	remaining := chunks[3:]

	rand.Shuffle(len(remaining), func(i, j int) {
		remaining[i], remaining[j] = remaining[j], remaining[i]
	})

	selected = append(selected, remaining[:2]...)

	logger.Log.Info(
		"chunks diversified successfully",
		logger.Any("selected_count", len(selected)),
	)

	return selected
}

func (s *KnowledgeBaseService) buildContext(
	chunks []runtimetypes.KnowledgeBaseRetrievalResult,
) string {

	logger.Log.Info(
		"building context",
		logger.Any("chunks", len(chunks)),
	)

	var builder strings.Builder

	for index, chunk := range chunks {

		if chunk.Content == nil {

			logger.Log.Warn(
				"chunk content is nil",
				logger.Any("index", index),
			)

			continue
		}

		if chunk.Content.Text == nil {

			logger.Log.Warn(
				"chunk text is nil",
				logger.Any("index", index),
			)

			continue
		}

		builder.WriteString(*chunk.Content.Text)
		builder.WriteString("\n\n")
	}

	context := builder.String()

	logger.Log.Info(
		"context built successfully",
		logger.Any("size", len(context)),
	)

	return context
}

func (s *KnowledgeBaseService) generateQuery(
	tag string,
) string {

	queries := []string{
		tag,
		fmt.Sprintf("concepts about %s", tag),
		fmt.Sprintf("facts about %s", tag),
		fmt.Sprintf("explanations about %s", tag),
		fmt.Sprintf("events related to %s", tag),
		fmt.Sprintf("curiosities about %s", tag),
	}

	selected := queries[rand.Intn(len(queries))]

	logger.Log.Info(
		"query generated",
		logger.String("tag", tag),
		logger.String("query", selected),
	)

	return selected
}

func (s *KnowledgeBaseService) getRandomTag(
	ctx context.Context,
	username string,
	documentNames []string,
) string {

	logger.Log.Info(
		"getting random tag",
		logger.String("username", username),
		logger.Any("documents", len(documentNames)),
	)

	var tags []string

	for _, name := range documentNames {

		metadataKey := fmt.Sprintf(
			"tenants/%s/context/%s.metadata.json",
			username,
			name,
		)

		logger.Log.Info(
			"loading metadata",
			logger.String("metadata_key", metadataKey),
		)

		metadata, err := s.StorageService.GetObjectMetadata(
			ctx,
			metadataKey,
		)

		if err != nil {

			logger.Log.Error(
				"failed to load metadata",
				logger.String("metadata_key", metadataKey),
				logger.String("error", err.Error()),
			)

			continue
		}

		logger.Log.Info(
			"metadata loaded",
			logger.Any(
				"tags",
				metadata.MetadataAttributes.Tags,
			),
		)

		tags = append(
			tags,
			metadata.MetadataAttributes.Tags...,
		)
	}

	logger.Log.Info(
		"all tags collected",
		logger.Any("tags", tags),
	)

	if len(tags) == 0 {

		logger.Log.Warn(
			"no tags available",
		)

		return ""
	}

	selected := tags[rand.Intn(len(tags))]

	logger.Log.Info(
		"random tag selected",
		logger.String("tag", selected),
	)

	return selected
}

func (s *KnowledgeBaseService) retrieveChunks(
	ctx context.Context,
	username string,
	schedulerId string,
	query string,
	tag string,
	topK int32,
) ([]runtimetypes.KnowledgeBaseRetrievalResult, error) {

	logger.Log.Info(
		"starting chunk retrieval",
		logger.String("username", username),
		logger.String("scheduler_id", schedulerId),
		logger.String("query", query),
		logger.String("tag", tag),
		logger.Any("top_k", topK),
	)

	output, err := s.RuntimeClient.Retrieve(
		ctx,
		&bedrockagentruntime.RetrieveInput{
			KnowledgeBaseId: aws.String(s.KnowledgeBaseId),
			RetrievalQuery: &runtimetypes.KnowledgeBaseQuery{
				Text: aws.String(query),
			},
			RetrievalConfiguration: &runtimetypes.KnowledgeBaseRetrievalConfiguration{
				VectorSearchConfiguration: &runtimetypes.KnowledgeBaseVectorSearchConfiguration{
					NumberOfResults: aws.Int32(topK),
					Filter: &runtimetypes.RetrievalFilterMemberAndAll{
						Value: []runtimetypes.RetrievalFilter{

							&runtimetypes.RetrievalFilterMemberEquals{
								Value: runtimetypes.FilterAttribute{
									Key:   aws.String("user"),
									Value: document.NewLazyDocument(username),
								},
							},

							&runtimetypes.RetrievalFilterMemberListContains{
								Value: runtimetypes.FilterAttribute{
									Key:   aws.String("schedulers"),
									Value: document.NewLazyDocument(schedulerId),
								},
							},

							&runtimetypes.RetrievalFilterMemberListContains{
								Value: runtimetypes.FilterAttribute{
									Key:   aws.String("tags"),
									Value: document.NewLazyDocument(tag),
								},
							},
						},
					},
				},
			},
		},
	)

	if err != nil {

		logger.Log.Error(
			"retrieve failed",
			logger.String("error", err.Error()),
		)

		return nil, fmt.Errorf(
			"failed to retrieve chunks: %w",
			err,
		)
	}

	logger.Log.Info(
		"retrieve completed",
		logger.Any(
			"results_count",
			len(output.RetrievalResults),
		),
	)

	for index, result := range output.RetrievalResults {

		score := 0.0
		content := ""

		if result.Score != nil {
			score = *result.Score
		}

		if result.Content != nil &&
			result.Content.Text != nil {

			content = *result.Content.Text
		}

		logger.Log.Info(
			"retrieval result",
			logger.Any("index", index),
			logger.Any("score", score),
			logger.String(
				"content_preview",
				truncate(content, 500),
			),
		)
	}

	return output.RetrievalResults, nil
}

func (s *KnowledgeBaseService) buildSourceChunks(
	chunks []runtimetypes.KnowledgeBaseRetrievalResult,
) []SourceChunk {

	var sources []SourceChunk

	for _, chunk := range chunks {

		if chunk.Content == nil ||
			chunk.Content.Text == nil {

			continue
		}

		source := SourceChunk{
			Content: *chunk.Content.Text,
		}

		if chunk.Score != nil {
			source.Score = *chunk.Score
		}

		sources = append(sources, source)
	}

	return sources
}

func truncate(
	value string,
	max int,
) string {

	if len(value) <= max {
		return value
	}

	return value[:max] + "..."
}

func cleanJSONResponse(text string) string {

	text = strings.TrimSpace(text)

	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")

	text = strings.TrimSuffix(text, "```")

	text = strings.TrimSpace(text)

	return text
}

func (s *KnowledgeBaseService) Sync(
	ctx context.Context,
) (string, error) {

	output, err := s.BedrockClient.StartIngestionJob(
		ctx,
		&bedrockagent.StartIngestionJobInput{
			KnowledgeBaseId: aws.String(s.KnowledgeBaseId),
			DataSourceId:    aws.String(s.DataSourceId),
		},
	)

	if err != nil {
		return "", fmt.Errorf(
			"failed to start KB ingestion job: %w",
			err,
		)
	}

	return *output.IngestionJob.IngestionJobId, nil
}

func (s *KnowledgeBaseService) GetSyncStatus(
	ctx context.Context,
	job string,
) (string, error) {

	output, err := s.BedrockClient.GetIngestionJob(
		ctx,
		&bedrockagent.GetIngestionJobInput{
			KnowledgeBaseId: aws.String(s.KnowledgeBaseId),
			DataSourceId:    aws.String(s.DataSourceId),
			IngestionJobId:  aws.String(job),
		},
	)

	if err != nil {
		return "", err
	}

	return string(output.IngestionJob.Status), nil
}

func (s *KnowledgeBaseService) AddDocument(
	ctx context.Context,
	s3URI string,
) error {

	_, err := s.BedrockClient.IngestKnowledgeBaseDocuments(
		ctx,
		&bedrockagent.IngestKnowledgeBaseDocumentsInput{
			KnowledgeBaseId: aws.String(s.KnowledgeBaseId),
			DataSourceId:    aws.String(s.DataSourceId),
			Documents: []types.KnowledgeBaseDocument{
				{
					Content: &types.DocumentContent{
						DataSourceType: types.ContentDataSourceTypeS3,
						S3: &types.S3Content{
							S3Location: &types.S3Location{
								Uri: aws.String(s3URI),
							},
						},
					},
				},
			},
		},
	)

	if err != nil {
		return fmt.Errorf(
			"failed to ingest document: %w",
			err,
		)
	}

	return nil
}

func (s *KnowledgeBaseService) DeleteDocument(
	ctx context.Context,
	documentIdentifier string,
) error {

	_, err := s.BedrockClient.DeleteKnowledgeBaseDocuments(
		ctx,
		&bedrockagent.DeleteKnowledgeBaseDocumentsInput{
			KnowledgeBaseId: aws.String(s.KnowledgeBaseId),
			DataSourceId:    aws.String(s.DataSourceId),
			DocumentIdentifiers: []types.DocumentIdentifier{
				{
					DataSourceType: types.ContentDataSourceTypeS3,
					S3: &types.S3Location{
						Uri: aws.String(documentIdentifier),
					},
				},
			},
		},
	)

	if err != nil {
		return fmt.Errorf(
			"failed to delete document: %w",
			err,
		)
	}

	return nil
}