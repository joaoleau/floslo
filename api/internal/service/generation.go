package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

type GenerateResponse struct {
	Output GenerateOutput `json:"output"`
}

type GenerateOutput struct {
	Message GenerateResponseMessage `json:"message"`
}

type GenerateResponseMessage struct {
	Content []GenerateResponseContent `json:"content"`
}

type GenerateResponseContent struct {
	Text string `json:"text"`
}

type GeneratedQuiz struct {
	Question     string             `json:"question"`
	Alternatives []QuizAlternative  `json:"alternatives"`
	Explanation  string             `json:"explanation"`
	Difficulty   string             `json:"difficulty"`
	Tag          string             `json:"tag"`
	SourceChunks []RetrievedChunk   `json:"source_chunks"`
}

type QuizAlternative struct {
	Id      string `json:"id"`
	Text    string `json:"text"`
	Correct bool   `json:"correct"`
}

type GenerationService struct {
	ModelClient *bedrockruntime.Client
	ModelId     string
}

func NewGenerationService(modelClient *bedrockruntime.Client,modelId string) *GenerationService {
	return &GenerationService{
		ModelClient: modelClient,
		ModelId:     modelId,
	}
}

func (s *GenerationService) GenerateQuiz(ctx context.Context, query string, tag string, contextText string) (*GeneratedQuiz, error) {
	prompt := fmt.Sprintf(`
You are an intelligent educational quiz generator.

Based ONLY on the provided context,
generate ONE multiple choice study question.

You MUST respond ONLY with valid JSON.

{
  "question": "string",
  "alternatives": [
    {
      "id": "A",
      "text": "string",
      "correct": false
    }
  ],
  "explanation": "string",
  "difficulty": "easy|medium|hard",
  "tag": "string"
}

CONTEXT:
%s

TOPIC:
%s
`, contextText, query)

	body := map[string]interface{}{
		"messages": []map[string]interface{}{
			{
				"role": "user",
				"content": []map[string]string{
					{
						"text": prompt,
					},
				},
			},
		},
		"inferenceConfig": map[string]interface{}{
			"max_new_tokens": 500,
			"temperature":    0.8,
			"top_p":          0.9,
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	output, err := s.ModelClient.InvokeModel(
		ctx,
		&bedrockruntime.InvokeModelInput{
			ModelId:     aws.String(s.ModelId),
			ContentType: aws.String("application/json"),
			Body:        payload,
		},
	)

	if err != nil {
		return nil, err
	}

	var response GenerateResponse

	if err := json.Unmarshal(output.Body, &response); err != nil {
		return nil, err
	}

	if len(response.Output.Message.Content) == 0 {
		return nil, fmt.Errorf("empty response")
	}

	raw := response.Output.Message.Content[0].Text

	raw = cleanJSONResponse(raw)

	var generated GeneratedQuiz

	if err := json.Unmarshal([]byte(raw), &generated); err != nil {
		return nil, err
	}

	if generated.Tag == "" {
		generated.Tag = tag
	}

	return &generated, nil
}

func cleanJSONResponse(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)
	return text
}