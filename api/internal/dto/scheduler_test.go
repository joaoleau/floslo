package dto

import (
	"encoding/json"
	"testing"
)

func TestChallengerDTOUnmarshalJSON(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr bool
		check   func(t *testing.T, c ChallengerDTO)
	}{
		{
			name: "quiz",
			json: `{"challenge_type":"QUIZ","language":"en","challenge":{"difficulty":"hard","question_count":7}}`,
			check: func(t *testing.T, c ChallengerDTO) {
				cfg, ok := c.Challenge.(QuizChallengeConfigDTO)
				if !ok {
					t.Fatalf("expected QuizChallengeConfigDTO, got %T", c.Challenge)
				}
				if cfg.Difficulty != "hard" || cfg.QuestionCount != 7 {
					t.Fatalf("unexpected quiz config: %+v", cfg)
				}
			},
		},
		{
			name: "flashcard",
			json: `{"challenge_type":"FLASHCARD","language":"pt","challenge":{"card_count":4}}`,
			check: func(t *testing.T, c ChallengerDTO) {
				cfg, ok := c.Challenge.(FlashcardChallengeConfigDTO)
				if !ok {
					t.Fatalf("expected FlashcardChallengeConfigDTO, got %T", c.Challenge)
				}
				if cfg.CardCount != 4 {
					t.Fatalf("unexpected flashcard config: %+v", cfg)
				}
			},
		},
		{
			name: "true_false",
			json: `{"challenge_type":"TRUE_FALSE","language":"es","challenge":{"difficulty":"easy","question_count":3}}`,
			check: func(t *testing.T, c ChallengerDTO) {
				cfg, ok := c.Challenge.(TrueFalseChallengeConfigDTO)
				if !ok {
					t.Fatalf("expected TrueFalseChallengeConfigDTO, got %T", c.Challenge)
				}
				if cfg.Difficulty != "easy" || cfg.QuestionCount != 3 {
					t.Fatalf("unexpected true/false config: %+v", cfg)
				}
			},
		},
		{
			name:    "unknown type",
			json:    `{"challenge_type":"MATCHING","language":"pt","challenge":{}}`,
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

func TestCreateSchedulerRequestDTOMixedChallengeTypes(t *testing.T) {
	raw := `{
		"name": "Estudo",
		"weekdays": ["MON"],
		"start_time": "07:00",
		"alarm_sound": "chic_pop",
		"object_ids": ["obj_1"],
		"challengers": [
			{"challenge_type":"QUIZ","language":"en","challenge":{"difficulty":"medium","question_count":5}},
			{"challenge_type":"FLASHCARD","language":"pt","challenge":{"card_count":6}}
		]
	}`

	var request CreateSchedulerRequestDTO
	if err := json.Unmarshal([]byte(raw), &request); err != nil {
		t.Fatalf("unexpected error unmarshaling mixed challengers: %v", err)
	}
	if len(request.Challengers) != 2 {
		t.Fatalf("expected 2 challengers, got %d", len(request.Challengers))
	}

	scheduler, err := request.ToModel()
	if err != nil {
		t.Fatalf("unexpected error converting to model: %v", err)
	}
	if scheduler.Challengers[0].Quiz == nil || scheduler.Challengers[0].Language != "en" {
		t.Fatalf("expected first challenger to be a Quiz in english, got %+v", scheduler.Challengers[0])
	}
	if scheduler.Challengers[1].Flashcard == nil || scheduler.Challengers[1].Language != "pt" {
		t.Fatalf("expected second challenger to be a Flashcard in portuguese, got %+v", scheduler.Challengers[1])
	}
}
