package dto

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/joaoleau/floslo/internal/model"
)

// Estes testes travam os nomes de campo que o app mobile espera
// (mobile/src/types/api/RAGDTO.ts e SchedulerDTO.ts). O Go e o TypeScript não
// compartilham tipos, então uma renomeação de um lado só quebraria o app sem nenhum erro.

func marshalToMap(t *testing.T, value any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	return decoded
}

func assertKeys(t *testing.T, name string, got map[string]any, want ...string) {
	t.Helper()
	for _, key := range want {
		if _, ok := got[key]; !ok {
			t.Errorf("%s is missing the field %q, got %v", name, key, got)
		}
	}
}

func assertNoKeys(t *testing.T, name string, got map[string]any, unwanted ...string) {
	t.Helper()
	for _, key := range unwanted {
		if _, ok := got[key]; ok {
			t.Errorf("%s must not have the field %q", name, key)
		}
	}
}

func TestChallengeResultContractMatchesTheApp(t *testing.T) {
	result := ChallengeResultDTO{
		ChallengeType:   "DISCOVERY",
		Language:        "pt",
		MultipleChoices: []MultipleChoiceDTO{{Question: "q"}},
		TrueFalses:      []TrueFalseDTO{{Statement: "s"}},
		Discoveries:     []DiscoveryDTO{{Title: "t", Content: "c"}},
	}

	decoded := marshalToMap(t, result)

	assertKeys(t, "challenge result", decoded, "challenge_type", "language", "multiple_choices", "true_falses", "discoveries")
	assertNoKeys(t, "challenge result", decoded, "flashcards")

	item := func(list string) map[string]any {
		return decoded[list].([]any)[0].(map[string]any)
	}
	assertKeys(t, "multiple choice", item("multiple_choices"), "question", "alternatives", "explanation", "tag", "source_chunks")
	assertKeys(t, "true/false", item("true_falses"), "statement", "answer", "explanation", "tag", "source_chunks")
	assertKeys(t, "discovery", item("discoveries"), "title", "content", "tag", "source_chunks")

	for _, list := range []string{"multiple_choices", "true_falses", "discoveries"} {
		assertNoKeys(t, list, item(list), "difficulty", "chunk_key", "origin")
	}
}

func TestSchedulerContractMatchesTheApp(t *testing.T) {
	scheduler := &model.Scheduler{
		Id:       "sch_1",
		Language: model.LanguagePT,
		Challengers: []model.Challenger{
			{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 3}},
			{ChallengeType: model.ChallengeTypeTrueFalse, TrueFalse: &model.TrueFalseChallengeConfig{QuestionCount: 1}},
			{ChallengeType: model.ChallengeTypeDiscovery, Discovery: &model.DiscoveryChallengeConfig{DiscoveryCount: 4}},
		},
	}

	decoded := marshalToMap(t, ToSchedulerResponseDTOList([]*model.Scheduler{scheduler})[0])

	assertKeys(t, "scheduler", decoded, "scheduler_id", "language", "challengers")

	challengers := decoded["challengers"].([]any)
	wantConfigKeys := []string{"question_count", "question_count", "discovery_count"}
	for i, raw := range challengers {
		challenger := raw.(map[string]any)
		assertKeys(t, "challenger", challenger, "challenge_type", "challenge")
		assertNoKeys(t, "challenger", challenger, "language", "difficulty")
		assertKeys(t, "challenge config", challenger["challenge"].(map[string]any), wantConfigKeys[i])
		assertNoKeys(t, "challenge config", challenger["challenge"].(map[string]any), "difficulty", "language")
	}
}

func TestSchedulerRequestUsesTheAppFieldNames(t *testing.T) {
	raw := `{
		"name": "Estudo",
		"language": "en",
		"weekdays": ["MON"],
		"start_time": "07:00",
		"alarm_sound": "chic_pop",
		"vibration": true,
		"sound_enabled": true,
		"object_ids": ["obj_1"],
		"challengers": [
			{"challenge_type": "MULTIPLE_CHOICE", "challenge": {"question_count": 3}},
			{"challenge_type": "DISCOVERY", "challenge": {"discovery_count": 2}}
		],
		"enabled": true
	}`

	var request CreateSchedulerRequestDTO
	if err := json.NewDecoder(strings.NewReader(raw)).Decode(&request); err != nil {
		t.Fatalf("the request the app sends must decode: %v", err)
	}

	scheduler, err := request.ToModel()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if scheduler.Language != model.LanguageEN || len(scheduler.Challengers) != 2 {
		t.Errorf("unexpected scheduler: %+v", scheduler)
	}
}

func TestRAGRequestCarriesTheLocalDate(t *testing.T) {
	var request RAGRequestDTO
	if err := json.Unmarshal([]byte(`{"scheduler_id":"sch_1","local_date":"2026-10-25"}`), &request); err != nil {
		t.Fatalf("the request the app sends must decode: %v", err)
	}
	if request.SchedulerId != "sch_1" || request.LocalDate != "2026-10-25" {
		t.Errorf("unexpected request: %+v", request)
	}
}

func TestRAGResponseCarriesTheCurrentStreakOnlyWhenRecorded(t *testing.T) {
	streak := 4
	assertKeys(t, "rag response", marshalToMap(t, RAGResponseDTO{CurrentStreak: &streak}), "current_streak")
	assertNoKeys(t, "rag response without a recorded day", marshalToMap(t, RAGResponseDTO{}), "current_streak")
}
