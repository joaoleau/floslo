package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/joaoleau/floslo/internal/config/logger"
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

func (s *GenerationService) GenerateQuizzes(ctx context.Context, query string, tags []string, contextText string, count int, difficulty string) ([]*GeneratedQuiz, error) {
	var topicsList strings.Builder
	for _, t := range tags {
		topicsList.WriteString("- ")
		topicsList.WriteString(t)
		topicsList.WriteString("\n")
	}

	prompt := fmt.Sprintf(`
You are an intelligent educational quiz generator.

Based ONLY on the provided context,
generate EXACTLY %d distinct multiple choice study question(s), at difficulty level: %s.
The "quizzes" array in your response MUST contain EXACTLY %d item(s) — never more, never fewer.

All questions MUST be distinct from each other and grounded ONLY in the provided context.
If — and only if — you are generating more than one question, spread them across the
different topics below where the context supports it, instead of concentrating all
questions on a single topic. If you are generating only one question, ignore the "spread"
guidance and just pick whichever single topic is best supported by the context.

Each question MUST have EXACTLY 4 alternatives, with ids "A", "B", "C", "D" in that order.
EXACTLY ONE of the 4 alternatives MUST have "correct": true — the other 3 MUST have
"correct": false. Never generate fewer or more than 4 alternatives.

You MUST respond ONLY with valid JSON.

{
  "quizzes": [
    {
      "question": "string",
      "alternatives": [
        { "id": "A", "text": "string", "correct": false },
        { "id": "B", "text": "string", "correct": true },
        { "id": "C", "text": "string", "correct": false },
        { "id": "D", "text": "string", "correct": false }
      ],
      "explanation": "string",
      "difficulty": "easy|medium|hard",
      "tag": "string"
    }
  ]
}

CONTEXT:
%s

TOPICS (each question should be grounded in ONE of these; set "tag" to whichever topic that specific question is really about):
%s
SEARCH QUERY (what was used to retrieve the context above):
%s
`, count, difficulty, count, contextText, topicsList.String(), query)

	maxTokens := 500 + count*300
	if maxTokens > 4000 {
		maxTokens = 4000
	}

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
			"max_new_tokens": maxTokens,
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

	var parsed struct {
		Quizzes []GeneratedQuiz `json:"quizzes"`
	}

	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil, err
	}

	// The model is only ever asked nicely in the prompt to return exactly `count` quizzes —
	// nothing there guarantees it. Observed in practice: with a low count and several topics
	// listed, the model sometimes returns one quiz per topic instead of respecting the total.
	// Enforce it here instead of trusting the prompt alone.
	if len(parsed.Quizzes) > count {
		logger.Log.Info(
			"model returned more quizzes than requested, truncating",
			logger.Any("requested", count),
			logger.Any("returned", len(parsed.Quizzes)),
		)
		parsed.Quizzes = parsed.Quizzes[:count]
	}

	generated := make([]*GeneratedQuiz, len(parsed.Quizzes))
	for i := range parsed.Quizzes {
		quiz := parsed.Quizzes[i]
		if quiz.Tag == "" && len(tags) > 0 {
			quiz.Tag = tags[0]
		}
		generated[i] = &quiz
	}

	return generated, nil
}

func cleanJSONResponse(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)
	return text
}