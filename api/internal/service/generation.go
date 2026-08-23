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

// GeneratedFlashcard is a single self-contained knowledge nugget (a "did you know" style fact
// or already-explained concept) -- unlike Quiz/TrueFalse it is not a question, has no
// right/wrong answer, and requires no interaction from the reader beyond reading it. Title is
// a short hook and Content is the fuller explanation -- split so the card reads as a genuine
// mini-article instead of one bare sentence.
type GeneratedFlashcard struct {
	Title        string           `json:"title"`
	Content      string           `json:"content"`
	Tag          string           `json:"tag"`
	SourceChunks []RetrievedChunk `json:"source_chunks"`
}

type GeneratedTrueFalse struct {
	Statement    string           `json:"statement"`
	Answer       bool             `json:"answer"` // true = the statement is factually correct
	Explanation  string           `json:"explanation"`
	Difficulty   string           `json:"difficulty"`
	Tag          string           `json:"tag"`
	SourceChunks []RetrievedChunk `json:"source_chunks"`
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

// languageNames maps a Language code to the name used in generation prompts. Keep in sync
// with model.Language / api/processor/services/tag.py SUPPORTED_LANGUAGES.
var languageNames = map[string]string{
	"pt": "Portuguese (pt-BR)",
	"en": "English",
	"es": "Spanish",
	"fr": "French",
	"de": "German",
	"it": "Italian",
}

// languageHeaderInstruction and languageReminderInstruction reinforce, at the prompt level,
// the language that VectorService.RetrieveRelevantChunksMultiForLanguage already tried to bias
// retrieval towards -- this is what's supposed to make the model translate when the language
// filter fell back to unfiltered (non-matching-language) context.
//
// The instruction is stated TWICE (once up top, right after the role sentence, once again
// right before the JSON schema) deliberately -- Nova Lite was observed in practice defaulting
// to the CONTEXT's language (e.g. Portuguese source material) for some target languages (it,
// es) even with a single mid-prompt instruction, while others (en) worked. Bracketing the
// instruction at both the start and end of the prompt is a standard mitigation for weaker
// models under-weighting an instruction buried in the middle of a long context-heavy prompt.
func languageHeaderInstruction(language string) string {
	name, ok := languageNames[language]
	if !ok {
		return ""
	}
	return fmt.Sprintf(`
CRITICAL LANGUAGE REQUIREMENT: you must write EVERY piece of output text below in %s. The
CONTEXT material provided further down may be written in a completely different language --
that is expected and does NOT change this requirement. Treat this as a translation task: read
the context in whatever language it is in, then produce your entire answer in %s. Never fall
back to the context's language.
`, name, name)
}

func languageReminderInstruction(language string) string {
	name, ok := languageNames[language]
	if !ok {
		return ""
	}
	return fmt.Sprintf("\nReminder: write the entire output (every piece of text) in %s, regardless of what language the context below is in. Do not default to the context's language.\n", name)
}

func topicsListText(tags []string) string {
	var topicsList strings.Builder
	for _, t := range tags {
		topicsList.WriteString("- ")
		topicsList.WriteString(t)
		topicsList.WriteString("\n")
	}
	return topicsList.String()
}

// invoke sends prompt to the configured Bedrock model and returns the raw (already
// ```-fence-stripped) text of its first response block. Shared by every GenerateX function --
// prompt building and response parsing are the parts that differ per challenge type.
func (s *GenerationService) invoke(ctx context.Context, prompt string, maxTokens int) (string, error) {
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
		return "", err
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
		return "", err
	}

	var response GenerateResponse
	if err := json.Unmarshal(output.Body, &response); err != nil {
		return "", err
	}

	if len(response.Output.Message.Content) == 0 {
		return "", fmt.Errorf("empty response")
	}

	return cleanJSONResponse(response.Output.Message.Content[0].Text), nil
}

// parseWrappedArray parses the model's JSON response into a list of T, tolerating two shapes:
// the requested `{"<key>": [...]}` envelope, or a bare `[...]` array -- observed in practice:
// the model sometimes drops the envelope object and returns the array directly, which used to
// hard-fail with "cannot unmarshal array into Go value of type struct{...}". Falls back to the
// bare-array shape only when the envelope shape fails to parse.
func parseWrappedArray[T any](raw string, key string) ([]T, error) {
	envelope := map[string]json.RawMessage{}
	if err := json.Unmarshal([]byte(raw), &envelope); err == nil {
		if inner, ok := envelope[key]; ok {
			var items []T
			if err := json.Unmarshal(inner, &items); err == nil {
				return items, nil
			}
		}
	}

	var items []T
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		logger.Log.Error(
			"failed to parse model response as either {key: [...]} or a bare array",
			logger.String("key", key),
			logger.Any("error", err),
			logger.String("raw", truncateForLog(raw)),
		)
		return nil, fmt.Errorf("failed to parse %s response: %w", key, err)
	}
	return items, nil
}

func truncateForLog(text string) string {
	const maxLen = 2000
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "...(truncated)"
}

func (s *GenerationService) GenerateQuizzes(ctx context.Context, query string, tags []string, contextText string, count int, difficulty string, language string) ([]*GeneratedQuiz, error) {
	prompt := fmt.Sprintf(`
You are an intelligent educational quiz generator.
%s
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
%s
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
`, languageHeaderInstruction(language), count, difficulty, count, languageReminderInstruction(language), contextText, topicsListText(tags), query)

	maxTokens := 500 + count*300
	if maxTokens > 4000 {
		maxTokens = 4000
	}

	raw, err := s.invoke(ctx, prompt, maxTokens)
	if err != nil {
		return nil, err
	}

	quizzes, err := parseWrappedArray[GeneratedQuiz](raw, "quizzes")
	if err != nil {
		return nil, err
	}

	// The model is only ever asked nicely in the prompt to return exactly `count` quizzes —
	// nothing there guarantees it. Observed in practice: with a low count and several topics
	// listed, the model sometimes returns one quiz per topic instead of respecting the total.
	// Enforce it here instead of trusting the prompt alone.
	if len(quizzes) > count {
		logger.Log.Info(
			"model returned more quizzes than requested, truncating",
			logger.Any("requested", count),
			logger.Any("returned", len(quizzes)),
		)
		quizzes = quizzes[:count]
	}

	generated := make([]*GeneratedQuiz, len(quizzes))
	for i := range quizzes {
		quiz := quizzes[i]
		if quiz.Tag == "" && len(tags) > 0 {
			quiz.Tag = tags[0]
		}
		generated[i] = &quiz
	}

	return generated, nil
}

func (s *GenerationService) GenerateFlashcards(ctx context.Context, query string, tags []string, contextText string, count int, language string) ([]*GeneratedFlashcard, error) {
	prompt := fmt.Sprintf(`
You are an intelligent generator of bite-sized study facts ("did you know" style flashcards)
for a mobile app screen -- each card needs enough substance to not look empty, so shallow
one-liners are not acceptable.
%s
Based ONLY on the provided context, generate EXACTLY %d distinct flashcard(s).
The "flashcards" array in your response MUST contain EXACTLY %d item(s) — never more, never fewer.

Each flashcard has TWO parts:
- "title": a short, punchy hook (roughly 4-9 words) that grabs attention and names the idea --
  e.g. "Mitochondria carry their own DNA" or "Rome didn't fall in a single battle".
- "content": a genuinely substantial explanation of that hook — 3 to 5 full sentences that
  actually teach something: give context, cause, consequence, a concrete example, or a
  surprising detail. Every sentence must add real information; do not pad with filler or
  repeat the title in different words.

This is NOT a question-and-answer pair: there is no separate question and no separate answer,
just a hook plus its own explanation. The reader should come away actually understanding the
idea after reading "content" alone, with nothing left to figure out or respond to. All
flashcards MUST be distinct from each other and grounded ONLY in the provided context.
If — and only if — you are generating more than one flashcard, spread them across the
different topics below where the context supports it. If you are generating only one, ignore
the "spread" guidance and just pick whichever single topic is best supported by the context.
%s
You MUST respond ONLY with valid JSON, in EXACTLY this shape -- a top-level object with a
"flashcards" key (never a bare top-level array), and each item having ONLY the three keys
"title", "content" and "tag" (never "front"/"back"/"question"/"answer" -- those belong to a
different, question-style challenge and must NOT be used here):

{
  "flashcards": [
    {
      "title": "Mitochondria carry their own DNA",
      "content": "Unlike the cell's other organelles, mitochondria have a small genome of their own, separate from the nucleus. That's because, under the endosymbiotic theory, they were once free-living bacteria absorbed by another cell billions of years ago. Over time that relationship became permanent: the host cell provides protection and nutrients, and the mitochondria provide energy. Mitochondrial DNA is also inherited almost entirely from the mother, making it a useful tool for tracing maternal ancestry.",
      "tag": "cell biology"
    }
  ]
}

CONTEXT:
%s

TOPICS (each flashcard should be grounded in ONE of these; set "tag" to whichever topic that specific flashcard is really about):
%s
SEARCH QUERY (what was used to retrieve the context above):
%s
`, languageHeaderInstruction(language), count, count, languageReminderInstruction(language), contextText, topicsListText(tags), query)

	maxTokens := 500 + count*350
	if maxTokens > 4000 {
		maxTokens = 4000
	}

	raw, err := s.invoke(ctx, prompt, maxTokens)
	if err != nil {
		return nil, err
	}

	rawCards, err := parseWrappedArray[rawFlashcard](raw, "flashcards")
	if err != nil {
		return nil, err
	}

	if len(rawCards) > count {
		logger.Log.Info(
			"model returned more flashcards than requested, truncating",
			logger.Any("requested", count),
			logger.Any("returned", len(rawCards)),
		)
		rawCards = rawCards[:count]
	}

	generated := make([]*GeneratedFlashcard, 0, len(rawCards))
	for _, card := range rawCards {
		content := card.resolveContent()
		if content == "" {
			logger.Log.Error("flashcard item had no usable content field, dropping it", logger.Any("raw_item", card))
			continue
		}
		tag := card.Tag
		if tag == "" && len(tags) > 0 {
			tag = tags[0]
		}
		generated = append(generated, &GeneratedFlashcard{Title: card.resolveTitle(), Content: content, Tag: tag})
	}

	if len(generated) == 0 {
		return nil, fmt.Errorf("flashcard generation returned no usable content")
	}

	return generated, nil
}

// rawFlashcard tolerates a few field-name variants the model has drifted to in practice
// despite the prompt asking specifically for "title"/"content" -- most commonly falling back to
// the older question/answer-style "front"/"back" shape. resolveContent/resolveTitle pick
// whichever variant is actually populated so a formatting drift degrades gracefully instead of
// shipping a blank card.
type rawFlashcard struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Front   string `json:"front"`
	Back    string `json:"back"`
	Text    string `json:"text"`
	Fact    string `json:"fact"`
	Tag     string `json:"tag"`
}

func (r rawFlashcard) resolveTitle() string {
	switch {
	case strings.TrimSpace(r.Title) != "":
		return strings.TrimSpace(r.Title)
	case strings.TrimSpace(r.Front) != "" && strings.TrimSpace(r.Back) != "":
		// Front/Back drift already gets combined into Content by resolveContent, so the title
		// here is left empty on purpose -- the UI just renders content-only in that case.
		return ""
	default:
		return ""
	}
}

func (r rawFlashcard) resolveContent() string {
	switch {
	case strings.TrimSpace(r.Content) != "":
		return strings.TrimSpace(r.Content)
	case strings.TrimSpace(r.Front) != "" && strings.TrimSpace(r.Back) != "":
		return strings.TrimSpace(r.Front) + " " + strings.TrimSpace(r.Back)
	case strings.TrimSpace(r.Text) != "":
		return strings.TrimSpace(r.Text)
	case strings.TrimSpace(r.Fact) != "":
		return strings.TrimSpace(r.Fact)
	case strings.TrimSpace(r.Front) != "":
		return strings.TrimSpace(r.Front)
	case strings.TrimSpace(r.Title) != "":
		// Last resort: the model put everything into "title" and left "content" empty.
		return strings.TrimSpace(r.Title)
	default:
		return ""
	}
}

func (s *GenerationService) GenerateTrueFalse(ctx context.Context, query string, tags []string, contextText string, count int, difficulty string, language string) ([]*GeneratedTrueFalse, error) {
	prompt := fmt.Sprintf(`
You are an intelligent educational true-or-false study question generator.
%s
Based ONLY on the provided context,
generate EXACTLY %d distinct true-or-false statement(s), at difficulty level: %s.
The "items" array in your response MUST contain EXACTLY %d item(s) — never more, never fewer.

Each item is a single factual STATEMENT (not a question) about the context, plus "answer":
true if the statement is factually correct according to the context, or false if it is
factually wrong. Roughly half of the statements across the whole set should be true and half
false — don't make them all true or all false. All statements MUST be distinct from each
other and grounded ONLY in the provided context.
If — and only if — you are generating more than one item, spread them across the different
topics below where the context supports it. If you are generating only one, ignore the
"spread" guidance and just pick whichever single topic is best supported by the context.
%s
You MUST respond ONLY with valid JSON.

{
  "items": [
    { "statement": "string", "answer": true, "explanation": "string", "difficulty": "easy|medium|hard", "tag": "string" }
  ]
}

CONTEXT:
%s

TOPICS (each item should be grounded in ONE of these; set "tag" to whichever topic that specific item is really about):
%s
SEARCH QUERY (what was used to retrieve the context above):
%s
`, languageHeaderInstruction(language), count, difficulty, count, languageReminderInstruction(language), contextText, topicsListText(tags), query)

	maxTokens := 400 + count*250
	if maxTokens > 4000 {
		maxTokens = 4000
	}

	raw, err := s.invoke(ctx, prompt, maxTokens)
	if err != nil {
		return nil, err
	}

	items, err := parseWrappedArray[GeneratedTrueFalse](raw, "items")
	if err != nil {
		return nil, err
	}

	if len(items) > count {
		logger.Log.Info(
			"model returned more true/false items than requested, truncating",
			logger.Any("requested", count),
			logger.Any("returned", len(items)),
		)
		items = items[:count]
	}

	generated := make([]*GeneratedTrueFalse, len(items))
	for i := range items {
		item := items[i]
		if item.Tag == "" && len(tags) > 0 {
			item.Tag = tags[0]
		}
		generated[i] = &item
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