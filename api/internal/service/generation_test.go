package service

import (
	"fmt"
	"strings"
	"testing"
)

func testSlots(count int, withSupport bool) []GenerationSlot {
	slots := make([]GenerationSlot, count)
	for i := range slots {
		slots[i].Main = RetrievedChunk{Key: fmt.Sprintf("vec_obj_abc_1_%d", i*2), Content: fmt.Sprintf("main passage %d", i+1)}
		if withSupport {
			slots[i].Support = &RetrievedChunk{Key: fmt.Sprintf("vec_obj_abc_1_%d", i*2+1), Content: fmt.Sprintf("support passage %d", i+1)}
		}
	}
	return slots
}

func multipleChoiceJSON(question string, correctAlternatives int) string {
	alternatives := make([]string, 4)
	for i := range alternatives {
		alternatives[i] = fmt.Sprintf(`{"id":"%c","text":"option %c","correct":%t}`, 'A'+i, 'A'+i, i < correctAlternatives)
	}
	return fmt.Sprintf(`{"question":%q,"alternatives":[%s],"explanation":"because","tag":"t"}`, question, strings.Join(alternatives, ","))
}

func TestParseWrappedArray(t *testing.T) {
	tests := []struct {
		name      string
		raw       string
		wantCount int
		wantErr   bool
	}{
		{
			name:      "wrapped object (requested shape)",
			raw:       `{"discoveries":[{"title":"a","content":"a","tag":"t"},{"title":"b","content":"b","tag":"t"}]}`,
			wantCount: 2,
		},
		{
			// Regression test: Bedrock has been observed dropping the {"discoveries": [...]}
			// envelope and returning the bare array directly, which used to hard-fail with
			// "cannot unmarshal array into Go value of type struct{...}" (a real 500 seen in
			// production). parseWrappedArray must tolerate this shape too.
			name:      "bare array (observed model drift)",
			raw:       `[{"title":"a","content":"a","tag":"t"},{"title":"b","content":"b","tag":"t"}]`,
			wantCount: 2,
		},
		{
			name:    "garbage",
			raw:     `not json at all`,
			wantErr: true,
		},
		{
			name:    "wrapped object missing the key and not an array either",
			raw:     `{"something_else": 1}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			items, err := parseWrappedArray[GeneratedDiscovery](tt.raw, "discoveries")
			if (err != nil) != tt.wantErr {
				t.Fatalf("parseWrappedArray() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && len(items) != tt.wantCount {
				t.Fatalf("expected %d items, got %d", tt.wantCount, len(items))
			}
		})
	}
}

func TestCleanJSONResponse(t *testing.T) {
	tests := map[string]string{
		"```json\n{\"a\":1}\n```": `{"a":1}`,
		"```\n{\"a\":1}\n```":     `{"a":1}`,
		"  {\"a\":1}  ":           `{"a":1}`,
	}
	for raw, want := range tests {
		if got := cleanJSONResponse(raw); got != want {
			t.Errorf("cleanJSONResponse(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestItemsFromResponseBindsItemsToSlotsByPosition(t *testing.T) {
	slots := testSlots(3, true)
	raw := fmt.Sprintf(`{"multiple_choices":[%s,%s,%s]}`, multipleChoiceJSON("q1", 1), multipleChoiceJSON("q2", 1), multipleChoiceJSON("q3", 1))

	items, err := itemsFromResponse[GeneratedMultipleChoice](raw, "multiple_choices", slots, []string{"topic"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(items) != 3 {
		t.Fatalf("got %d items, want 3", len(items))
	}
	for i, item := range items {
		if len(item.SourceChunks) != 2 || item.SourceChunks[0].Key != slots[i].Main.Key || item.SourceChunks[1].Key != slots[i].Support.Key {
			t.Errorf("item %d sources = %+v, want the slot's main and support chunks", i, item.SourceChunks)
		}
	}
	if items[1].Question != "q2" {
		t.Errorf("item order changed: %q", items[1].Question)
	}
}

func TestItemsFromResponseWithoutSupport(t *testing.T) {
	slots := testSlots(1, false)

	items, err := itemsFromResponse[GeneratedMultipleChoice](`{"multiple_choices":[`+multipleChoiceJSON("q1", 1)+`]}`, "multiple_choices", slots, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items[0].SourceChunks) != 1 || items[0].SourceChunks[0].Key != slots[0].Main.Key {
		t.Errorf("item = %+v, want a single source bound to the main chunk", items[0])
	}
}

func TestItemsFromResponseDoesNotBindWhenTheCountIsWrong(t *testing.T) {
	tests := []struct {
		name      string
		returned  int
		wantItems int
	}{
		{name: "fewer than requested", returned: 2, wantItems: 2},
		{name: "more than requested is truncated", returned: 5, wantItems: 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			slots := testSlots(3, true)
			multiple_choices := make([]string, tt.returned)
			for i := range multiple_choices {
				multiple_choices[i] = multipleChoiceJSON(fmt.Sprintf("q%d", i+1), 1)
			}

			items, err := itemsFromResponse[GeneratedMultipleChoice](`{"multiple_choices":[`+strings.Join(multiple_choices, ",")+`]}`, "multiple_choices", slots, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(items) != tt.wantItems {
				t.Fatalf("got %d items, want %d", len(items), tt.wantItems)
			}
			for i, item := range items {
				if len(item.SourceChunks) != 6 {
					t.Errorf("item %d should list every chunk of the call, got %d", i, len(item.SourceChunks))
				}
			}
		})
	}
}

func TestItemsFromResponseDropsUnusableItemsAndDoesNotBind(t *testing.T) {
	slots := testSlots(3, false)
	raw := fmt.Sprintf(`{"multiple_choices":[%s,%s,%s]}`, multipleChoiceJSON("q1", 1), multipleChoiceJSON("two correct answers", 2), multipleChoiceJSON("q3", 1))

	items, err := itemsFromResponse[GeneratedMultipleChoice](raw, "multiple_choices", slots, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(items) != 2 || items[0].Question != "q1" || items[1].Question != "q3" {
		t.Fatalf("items = %+v, want q1 and q3", items)
	}
	for _, item := range items {
		if len(item.SourceChunks) != len(slots) {
			t.Errorf("positions shifted, so %q must list every chunk of the call", item.Question)
		}
	}
}

func TestItemsFromResponseFailsWhenNothingIsUsable(t *testing.T) {
	slots := testSlots(2, false)
	raw := fmt.Sprintf(`{"multiple_choices":[%s,%s]}`, multipleChoiceJSON("no correct answer", 0), multipleChoiceJSON("", 1))

	if _, err := itemsFromResponse[GeneratedMultipleChoice](raw, "multiple_choices", slots, nil); err == nil {
		t.Error("expected an error when every item is unusable")
	}
}

func TestItemsFromResponseFillsAMissingTagWithTheFirstTopic(t *testing.T) {
	slots := testSlots(1, false)
	raw := `{"discoveries":[{"title":"X","content":"X is Y."}]}`

	items, err := itemsFromResponse[GeneratedDiscovery](raw, "discoveries", slots, []string{"topic one", "topic two"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if items[0].Tag != "topic one" {
		t.Errorf("tag = %q, want the first topic", items[0].Tag)
	}
}

func TestItemsFromResponseAcceptsABareArray(t *testing.T) {
	slots := testSlots(2, false)
	raw := `[{"statement":"A is true","answer":true,"explanation":"e","tag":"t"},{"statement":"B is false","answer":false,"explanation":"e","tag":"t"}]`

	items, err := itemsFromResponse[GeneratedTrueFalse](raw, "items", slots, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 2 || items[1].SourceChunks[0].Key != slots[1].Main.Key || items[1].Answer {
		t.Errorf("items = %+v", items)
	}
}

func TestItemsFromResponseValidatesEachType(t *testing.T) {
	slots := testSlots(1, false)

	if _, err := itemsFromResponse[GeneratedDiscovery](`{"discoveries":[{"title":"hook","content":""}]}`, "discoveries", slots, nil); err == nil {
		t.Error("a discovery without content should be dropped")
	}
	if _, err := itemsFromResponse[GeneratedTrueFalse](`{"items":[{"statement":"","answer":true}]}`, "items", slots, nil); err == nil {
		t.Error("a true/false item without a statement should be dropped")
	}

	discoveries, err := itemsFromResponse[GeneratedDiscovery](`{"discoveries":[{"content":"a fact without a hook"}]}`, "discoveries", slots, nil)
	if err != nil || len(discoveries) != 1 {
		t.Errorf("a discovery without a title is still usable, got (%v, %v)", discoveries, err)
	}
}

func TestSlotsPromptText(t *testing.T) {
	text := slotsPromptText(testSlots(2, true))

	for _, want := range []string{"SLOT 1", "SLOT 2", "MAIN PASSAGE:\nmain passage 1", "SUPPORT PASSAGE:\nsupport passage 2"} {
		if !strings.Contains(text, want) {
			t.Errorf("slots text is missing %q:\n%s", want, text)
		}
	}
	if strings.Contains(slotsPromptText(testSlots(1, false)), "SUPPORT") {
		t.Error("a slot without support should not have a SUPPORT block")
	}
}

func TestPromptsCarryTheSlotsAndNeverLeakIdsOrDifficulty(t *testing.T) {
	slots := testSlots(2, true)
	tags := []string{"cell biology"}

	prompts := map[string]string{
		"multiple choice": multipleChoicePrompt("pt", slots, tags),
		"true/false":      trueFalsePrompt("pt", slots, tags),
		"discovery":       discoveryPrompt("pt", slots, tags),
	}

	for name, prompt := range prompts {
		t.Run(name, func(t *testing.T) {
			for _, want := range []string{"EXACTLY 2", "SLOT 1", "SLOT 2", "main passage 1", "support passage 2", "- cell biology", "Portuguese (pt-BR)"} {
				if !strings.Contains(prompt, want) {
					t.Errorf("prompt is missing %q", want)
				}
			}
			if strings.Contains(strings.ToLower(prompt), "difficulty") {
				t.Error("the prompt must not mention difficulty")
			}
			if strings.Contains(prompt, "vec_") {
				t.Error("the prompt must not contain chunk ids")
			}
			if strings.Contains(prompt, "%!") {
				t.Errorf("the prompt has a formatting error:\n%s", prompt)
			}
		})
	}
}

func TestTokenBudget(t *testing.T) {
	if got := tokenBudget(500, 300, 3); got != 1400 {
		t.Errorf("tokenBudget(500, 300, 3) = %d, want 1400", got)
	}
	if got := tokenBudget(500, 350, 10); got != maxOutputTokens {
		t.Errorf("tokenBudget above the cap = %d, want %d", got, maxOutputTokens)
	}
}
