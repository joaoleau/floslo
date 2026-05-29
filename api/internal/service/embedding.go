package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

type EmbeddingRequest struct {
	InputText string `json:"inputText"`
}

type EmbeddingResponse struct {
	Embedding []float32 `json:"embedding"`
}

type EmbeddingService struct {
	ModelClient *bedrockruntime.Client
	ModelId     string
}

func NewEmbeddingService(modelClient *bedrockruntime.Client, modelId string) *EmbeddingService {
	return &EmbeddingService{
		ModelClient: modelClient,
		ModelId:     modelId,
	}
}

func (s *EmbeddingService) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	payload, err := json.Marshal(EmbeddingRequest{InputText: text,})

	if err != nil {
		return nil, err
	}

	output, err := s.ModelClient.InvokeModel(ctx, &bedrockruntime.InvokeModelInput{
			ModelId:     aws.String(s.ModelId),
			ContentType: aws.String("application/json"),
			Body:        payload,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("failed to invoke embedding model: %w",err)
	}

	var response EmbeddingResponse
	if err := json.Unmarshal(output.Body, &response); err != nil {
		return nil, err
	}
	return response.Embedding, nil
}