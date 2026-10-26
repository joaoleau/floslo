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

// Os itens gerados trazem Tag e SourceChunks, que não vêm do modelo: quem monta os slots é o
// backend, e o item i da resposta é ligado ao slot i por posição. A tag é a da busca que
// encontrou o chunk principal do slot, e a fonte são os chunks do slot.

type GeneratedMultipleChoice struct {
	Question     string                      `json:"question"`
	Alternatives []MultipleChoiceAlternative `json:"alternatives"`
	Explanation  string                      `json:"explanation"`
	Tag          string                      `json:"tag"`
	SourceChunks []RetrievedChunk            `json:"source_chunks"`
}

type MultipleChoiceAlternative struct {
	Id      string `json:"id"`
	Text    string `json:"text"`
	Correct bool   `json:"correct"`
}

// GeneratedDiscovery só apresenta um conteúdo ("você sabia?"), sem pergunta e sem nota.
type GeneratedDiscovery struct {
	Title        string           `json:"title"`
	Content      string           `json:"content"`
	Tag          string           `json:"tag"`
	SourceChunks []RetrievedChunk `json:"source_chunks"`
}

type GeneratedTrueFalse struct {
	Statement    string           `json:"statement"`
	Answer       bool             `json:"answer"` // true = the statement is factually correct
	Explanation  string           `json:"explanation"`
	Tag          string           `json:"tag"`
	SourceChunks []RetrievedChunk `json:"source_chunks"`
}

type GenerationService struct {
	ModelClient *bedrockruntime.Client
	ModelId     string
}

func NewGenerationService(modelClient *bedrockruntime.Client, modelId string) *GenerationService {
	return &GenerationService{
		ModelClient: modelClient,
		ModelId:     modelId,
	}
}

// GenerationSlot é uma vaga do prompt: a passagem principal (o chunk foco), a tag cuja busca a
// encontrou e, se houver, uma passagem de apoio só para dar contexto.
type GenerationSlot struct {
	Main    RetrievedChunk
	Tag     string
	Support *RetrievedChunk
}

func (s GenerationSlot) chunks() []RetrievedChunk {
	if s.Support == nil {
		return []RetrievedChunk{s.Main}
	}
	return []RetrievedChunk{s.Main, *s.Support}
}

var languageNames = map[string]string{
	"pt": "Portuguese (pt-BR)",
	"en": "English",
	"es": "Spanish",
	"fr": "French",
	"de": "German",
	"it": "Italian",
}

func languageHeaderInstruction(language string) string {
	name, ok := languageNames[language]
	if !ok {
		return ""
	}
	return fmt.Sprintf(`
CRITICAL LANGUAGE REQUIREMENT: you must write EVERY piece of output text below in %s. The
material provided further down may be written in a completely different language -- that is
expected and does NOT change this requirement. Treat this as a translation task: read the
material in whatever language it is in, then produce your entire answer in %s. Never fall
back to the material's language.
`, name, name)
}

func languageReminderInstruction(language string) string {
	name, ok := languageNames[language]
	if !ok {
		return ""
	}
	return fmt.Sprintf("\nReminder: write the entire output (every piece of text) in %s, regardless of what language the material below is in. Do not default to the material's language.\n", name)
}

// slotsPromptText monta o bloco SLOTS do prompt. Os rótulos são só posições ("SLOT 1"): o
// modelo nunca vê nem devolve ids de chunk.
func slotsPromptText(slots []GenerationSlot) string {
	var text strings.Builder
	for i, slot := range slots {
		fmt.Fprintf(&text, "SLOT %d\nMAIN PASSAGE:\n%s\n", i+1, slot.Main.Content)
		if slot.Support != nil {
			fmt.Fprintf(&text, "\nSUPPORT PASSAGE:\n%s\n", slot.Support.Content)
		}
		text.WriteString("\n")
	}
	return text.String()
}

// maxOutputTokens é o teto de tokens de saída por chamada.
const maxOutputTokens = 4000

func tokenBudget(base int, perItem int, count int) int {
	return min(base+perItem*count, maxOutputTokens)
}

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

// slotItem é o que um item gerado precisa oferecer para ser validado e ligado ao slot.
type slotItem interface {
	isUsable() bool
	bindSlot(slot GenerationSlot)
}

func (q *GeneratedMultipleChoice) isUsable() bool {
	if strings.TrimSpace(q.Question) == "" || len(q.Alternatives) != 4 {
		return false
	}
	correct := 0
	for _, alternative := range q.Alternatives {
		if strings.TrimSpace(alternative.Text) == "" {
			return false
		}
		if alternative.Correct {
			correct++
		}
	}
	// Sem exatamente uma alternativa correta o usuário não conseguiria concluir o desafio.
	return correct == 1
}

func (q *GeneratedMultipleChoice) bindSlot(slot GenerationSlot) {
	q.Tag, q.SourceChunks = slot.Tag, slot.chunks()
}

func (d *GeneratedDiscovery) isUsable() bool {
	return strings.TrimSpace(d.Content) != ""
}

func (d *GeneratedDiscovery) bindSlot(slot GenerationSlot) {
	d.Tag, d.SourceChunks = slot.Tag, slot.chunks()
}

func (t *GeneratedTrueFalse) isUsable() bool {
	return strings.TrimSpace(t.Statement) != ""
}

func (t *GeneratedTrueFalse) bindSlot(slot GenerationSlot) {
	t.Tag, t.SourceChunks = slot.Tag, slot.chunks()
}

// itemsFromResponse converte a resposta do modelo em itens ligados aos slots. O item i
// corresponde ao slot i, decisão do backend: o modelo não devolve ids. Se a quantidade
// devolvida for diferente da pedida, não há como saber de qual slot saiu cada item, então
// nenhum item do tipo é aproveitado. Com a quantidade certa, cada item utilizável recebe a
// tag e os chunks do seu slot, e os inutilizáveis são descartados.
func itemsFromResponse[T any, P interface {
	*T
	slotItem
}](raw string, wrapperKey string, slots []GenerationSlot) ([]*T, error) {
	parsed, err := parseWrappedArray[T](raw, wrapperKey)
	if err != nil {
		return nil, err
	}

	if len(parsed) != len(slots) {
		return nil, fmt.Errorf("%s generation returned %d items for %d slots", wrapperKey, len(parsed), len(slots))
	}

	items := make([]*T, 0, len(parsed))
	for i := range parsed {
		item := P(&parsed[i])
		if !item.isUsable() {
			logger.Log.Error("model returned an unusable item, dropping it", logger.String("key", wrapperKey), logger.Any("position", i))
			continue
		}
		item.bindSlot(slots[i])
		items = append(items, &parsed[i])
	}

	if len(items) == 0 {
		return nil, fmt.Errorf("%s generation returned no usable items", wrapperKey)
	}
	return items, nil
}

func multipleChoicePrompt(language string, slots []GenerationSlot) string {
	return fmt.Sprintf(`
You are an expert author of multiple-choice study questions.
%s
The material below is split into numbered SLOTS. Each slot has a MAIN PASSAGE and may have
SUPPORT passages. Generate EXACTLY %d multiple-choice questions: one per slot, in the same
order as the slots. The "multiple_choices" array in your response MUST contain EXACTLY %d item(s),
never more, never fewer.

For each slot, write ONE question about ONE single fact or idea from that slot's MAIN
PASSAGE. Use the SUPPORT passages only to make the question clear and self-contained.
Ground every question ONLY in the provided material; never add outside knowledge.

QUESTION rules:
- One clear, specific question with a single well-defined correct answer.
- It must make sense on its own: never write "according to the text", "in the passage",
  "the author" or anything that assumes the learner has the material at hand.

ALTERNATIVES rules:
- Exactly 4 alternatives, with ids "A", "B", "C", "D" in that order.
- EXACTLY ONE alternative has "correct": true; the other three have "correct": false.
- The wrong alternatives must be plausible and related to the topic, but clearly wrong
  according to the material. Do not use "all of the above" or "none of the above". Keep the
  four alternatives similar in length and style so the correct one is not easy to spot, and
  vary which position holds the correct one.

EXPLANATION rules:
- One or two short sentences stating why the correct alternative is right. It is shown to
  the learner after they answer.

All questions must be distinct from one another.
%s
You MUST respond ONLY with valid JSON, in EXACTLY this shape:

{
  "multiple_choices": [
    {
      "question": "string",
      "alternatives": [
        { "id": "A", "text": "string", "correct": false },
        { "id": "B", "text": "string", "correct": true },
        { "id": "C", "text": "string", "correct": false },
        { "id": "D", "text": "string", "correct": false }
      ],
      "explanation": "string"
    }
  ]
}

SLOTS:
%s
`, languageHeaderInstruction(language), len(slots), len(slots), languageReminderInstruction(language), slotsPromptText(slots))
}

func trueFalsePrompt(language string, slots []GenerationSlot) string {
	return fmt.Sprintf(`
You are an expert author of true-or-false study statements.
%s
The material below is split into numbered SLOTS. Each slot has a MAIN PASSAGE and may have
SUPPORT passages. Generate EXACTLY %d statements: one per slot, in the same order as the
slots. The "items" array in your response MUST contain EXACTLY %d item(s), never more,
never fewer.

For each slot, write ONE factual STATEMENT (not a question) about ONE single fact or idea
from that slot's MAIN PASSAGE, and set "answer" to true if the statement is correct
according to the material or false if it is wrong. Use the SUPPORT passages only to make
the statement clear and self-contained. Ground every statement ONLY in the provided
material; never add outside knowledge.

STATEMENT rules:
- It must make sense on its own: never write "according to the text", "in the passage",
  "the author" or anything that assumes the learner has the material at hand.
- Across the whole set, about half of the statements should be true and half false.
- A false statement must be plausible: build it by changing one key element of a real fact
  from the passage, not by simply adding a negation.
- Avoid words such as "always", "never", "only" or "all" that give the answer away.

EXPLANATION rules:
- One or two short sentences stating the correct fact. It is shown to the learner after
  they answer.

All statements must be distinct from one another.
%s
You MUST respond ONLY with valid JSON, in EXACTLY this shape:

{
  "items": [
    { "statement": "string", "answer": true, "explanation": "string" }
  ]
}

SLOTS:
%s
`, languageHeaderInstruction(language), len(slots), len(slots), languageReminderInstruction(language), slotsPromptText(slots))
}

func discoveryPrompt(language string, slots []GenerationSlot) string {
	return fmt.Sprintf(`
You are an intelligent generator of bite-sized study facts ("did you know" style) for a
mobile app screen. Each item needs enough substance to not look empty, so shallow one-liners
are not acceptable.
%s
The material below is split into numbered SLOTS. Each slot has a MAIN PASSAGE and may have
SUPPORT passages. Generate EXACTLY %d discoveries: one per slot, in the same order as the
slots. The "discoveries" array in your response MUST contain EXACTLY %d item(s), never more,
never fewer.

Each discovery has TWO parts, both about ONE idea from the slot's MAIN PASSAGE (use SUPPORT
passages only to make it clear and self-contained; never add outside knowledge):
- "title": a short, punchy hook (roughly 4 to 9 words) that names the idea, for example
  "Mitochondria carry their own DNA".
- "content": a genuinely substantial explanation of that hook, 3 to 5 full sentences that
  actually teach something: give context, cause, consequence, a concrete example or a
  surprising detail. Every sentence must add real information; do not pad with filler or
  repeat the title in different words.

This is NOT a question-and-answer pair: there is no separate question and no separate
answer, just a hook plus its own explanation. The reader should understand the idea after
reading "content" alone, with nothing left to respond to. All discoveries must be distinct
from one another.
%s
You MUST respond ONLY with valid JSON, in EXACTLY this shape: a top-level object with a
"discoveries" key, and each item having ONLY the keys "title" and "content".

{
  "discoveries": [
    {
      "title": "Mitochondria carry their own DNA",
      "content": "Unlike the cell's other organelles, mitochondria have a small genome of their own, separate from the nucleus. Under the endosymbiotic theory, they were once free-living bacteria absorbed by another cell billions of years ago. Over time that relationship became permanent: the host cell provides protection and nutrients, and the mitochondria provide energy. Mitochondrial DNA is also inherited almost entirely from the mother, which makes it a useful tool for tracing maternal ancestry."
    }
  ]
}

SLOTS:
%s
`, languageHeaderInstruction(language), len(slots), len(slots), languageReminderInstruction(language), slotsPromptText(slots))
}

func (s *GenerationService) GenerateMultipleChoices(ctx context.Context, slots []GenerationSlot, language string) ([]*GeneratedMultipleChoice, error) {
	raw, err := s.invoke(ctx, multipleChoicePrompt(language, slots), tokenBudget(500, 300, len(slots)))
	if err != nil {
		return nil, err
	}
	return itemsFromResponse[GeneratedMultipleChoice](raw, "multiple_choices", slots)
}

func (s *GenerationService) GenerateTrueFalse(ctx context.Context, slots []GenerationSlot, language string) ([]*GeneratedTrueFalse, error) {
	raw, err := s.invoke(ctx, trueFalsePrompt(language, slots), tokenBudget(400, 250, len(slots)))
	if err != nil {
		return nil, err
	}
	return itemsFromResponse[GeneratedTrueFalse](raw, "items", slots)
}

func (s *GenerationService) GenerateDiscoveries(ctx context.Context, slots []GenerationSlot, language string) ([]*GeneratedDiscovery, error) {
	raw, err := s.invoke(ctx, discoveryPrompt(language, slots), tokenBudget(500, 350, len(slots)))
	if err != nil {
		return nil, err
	}
	return itemsFromResponse[GeneratedDiscovery](raw, "discoveries", slots)
}

func cleanJSONResponse(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)
	return text
}
