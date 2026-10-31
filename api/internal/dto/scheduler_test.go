package dto

import (
	"encoding/json"
	"testing"

	"github.com/joaoleau/floslo/internal/model"
)

func TestChallengerDTOUnmarshalJSON(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr bool
		check   func(t *testing.T, c ChallengerDTO)
	}{
		{
			name: "multiple choice",
			json: `{"challenge_type":"MULTIPLE_CHOICE","challenge":{"question_count":7}}`,
			check: func(t *testing.T, c ChallengerDTO) {
				cfg, ok := c.Challenge.(MultipleChoiceChallengeConfigDTO)
				if !ok {
					t.Fatalf("expected MultipleChoiceChallengeConfigDTO, got %T", c.Challenge)
				}
				if cfg.QuestionCount != 7 {
					t.Fatalf("unexpected multiple choice config: %+v", cfg)
				}
			},
		},
		{
			name: "true_false",
			json: `{"challenge_type":"TRUE_FALSE","challenge":{"question_count":3}}`,
			check: func(t *testing.T, c ChallengerDTO) {
				cfg, ok := c.Challenge.(TrueFalseChallengeConfigDTO)
				if !ok {
					t.Fatalf("expected TrueFalseChallengeConfigDTO, got %T", c.Challenge)
				}
				if cfg.QuestionCount != 3 {
					t.Fatalf("unexpected true/false config: %+v", cfg)
				}
			},
		},
		{
			name: "discovery",
			json: `{"challenge_type":"DISCOVERY","challenge":{"discovery_count":2}}`,
			check: func(t *testing.T, c ChallengerDTO) {
				cfg, ok := c.Challenge.(DiscoveryChallengeConfigDTO)
				if !ok {
					t.Fatalf("expected DiscoveryChallengeConfigDTO, got %T", c.Challenge)
				}
				if cfg.DiscoveryCount != 2 {
					t.Fatalf("unexpected discovery config: %+v", cfg)
				}
			},
		},
		{
			name:    "unknown type",
			json:    `{"challenge_type":"MATCHING","challenge":{}}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var c ChallengerDTO
			err := json.Unmarshal([]byte(tt.json), &c)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Unmarshal() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && tt.check != nil {
				tt.check(t, c)
			}
		})
	}
}

func TestChallengerDTOMapsBackAndForthForEveryType(t *testing.T) {
	challengers := []model.Challenger{
		{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 3}},
		{ChallengeType: model.ChallengeTypeTrueFalse, TrueFalse: &model.TrueFalseChallengeConfig{QuestionCount: 2}},
		{ChallengeType: model.ChallengeTypeDiscovery, Discovery: &model.DiscoveryChallengeConfig{DiscoveryCount: 1}},
	}

	dtos := challengersToDTOList(challengers)
	roundTripped, err := challengerDTOsToModel(dtos)
	if err != nil {
		t.Fatalf("unexpected error converting back to model: %v", err)
	}

	for i, want := range challengers {
		got := roundTripped[i]
		if got.ChallengeType != want.ChallengeType || got.ItemCount() != want.ItemCount() {
			t.Errorf("challenger %d: got %s with %d items, want %s with %d", i, got.ChallengeType, got.ItemCount(), want.ChallengeType, want.ItemCount())
		}
	}
}

func TestCreateSchedulerRequestDTOMixedChallengeTypes(t *testing.T) {
	raw := `{
		"name": "Estudo",
		"language": "en",
		"weekdays": ["MON"],
		"start_time": "07:00",
		"alarm_sound": "chic_pop",
		"object_ids": ["obj_1"],
		"challengers": [
			{"challenge_type":"MULTIPLE_CHOICE","challenge":{"question_count":5}},
			{"challenge_type":"TRUE_FALSE","challenge":{"question_count":4}},
			{"challenge_type":"DISCOVERY","challenge":{"discovery_count":1}}
		]
	}`

	var request CreateSchedulerRequestDTO
	if err := json.Unmarshal([]byte(raw), &request); err != nil {
		t.Fatalf("unexpected error unmarshaling mixed challengers: %v", err)
	}
	if len(request.Challengers) != 3 {
		t.Fatalf("expected 3 challengers, got %d", len(request.Challengers))
	}

	scheduler, err := request.ToModel()
	if err != nil {
		t.Fatalf("unexpected error converting to model: %v", err)
	}
	if scheduler.Language != model.LanguageEN {
		t.Errorf("expected the scheduler language to be en, got %q", scheduler.Language)
	}
	if scheduler.Challengers[0].MultipleChoice == nil || scheduler.Challengers[0].MultipleChoice.QuestionCount != 5 {
		t.Errorf("expected first challenger to be a MultipleChoice with 5 questions, got %+v", scheduler.Challengers[0])
	}
	if scheduler.Challengers[1].TrueFalse == nil || scheduler.Challengers[1].TrueFalse.QuestionCount != 4 {
		t.Errorf("expected second challenger to be a TrueFalse with 4 statements, got %+v", scheduler.Challengers[1])
	}
	if scheduler.Challengers[2].Discovery == nil || scheduler.Challengers[2].Discovery.DiscoveryCount != 1 {
		t.Errorf("expected third challenger to be a Discovery with 1 item, got %+v", scheduler.Challengers[2])
	}
}

func TestUpdateSchedulerRequestDTOLanguage(t *testing.T) {
	t.Run("language provided", func(t *testing.T) {
		var request UpdateSchedulerRequestDTO
		if err := json.Unmarshal([]byte(`{"language":"fr"}`), &request); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		update, err := request.ToModel()
		if err != nil {
			t.Fatalf("unexpected error converting to model: %v", err)
		}
		if update.Language == nil || *update.Language != model.LanguageFR {
			t.Errorf("expected language fr, got %v", update.Language)
		}
	})

	t.Run("language omitted", func(t *testing.T) {
		var request UpdateSchedulerRequestDTO
		if err := json.Unmarshal([]byte(`{"name":"Novo nome"}`), &request); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		update, err := request.ToModel()
		if err != nil {
			t.Fatalf("unexpected error converting to model: %v", err)
		}
		if update.Language != nil {
			t.Errorf("expected the language to stay untouched, got %v", *update.Language)
		}
	})
}

func TestSchedulerResponseCarriesTheLanguage(t *testing.T) {
	schedulers := []*model.Scheduler{{Id: "sch_1", Language: model.LanguageDE}}

	response := ToSchedulerResponseDTOList(schedulers)

	if response[0].Language != "de" {
		t.Errorf("expected language de in the response, got %q", response[0].Language)
	}
}
