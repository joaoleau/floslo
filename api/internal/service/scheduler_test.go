package service

import (
	"testing"

	"github.com/joaoleau/floslo/internal/model"
)

func TestValidateChallenger(t *testing.T) {
	tests := []struct {
		name      string
		challenger model.Challenger
		wantErr   bool
	}{
		{
			name: "valid quiz",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeQuiz,
				Language:      model.LanguagePT,
				Quiz:          &model.QuizChallengeConfig{Difficulty: "medium", QuestionCount: 5},
			},
			wantErr: false,
		},
		{
			name: "valid flashcard",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeFlashcard,
				Language:      model.LanguageEN,
				Flashcard:     &model.FlashcardChallengeConfig{CardCount: 5},
			},
			wantErr: false,
		},
		{
			name: "valid true/false",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeTrueFalse,
				Language:      model.LanguageES,
				TrueFalse:     &model.TrueFalseChallengeConfig{Difficulty: "hard", QuestionCount: 3},
			},
			wantErr: false,
		},
		{
			name: "unknown challenge type",
			challenger: model.Challenger{
				ChallengeType: "MATCHING",
				Language:      model.LanguagePT,
			},
			wantErr: true,
		},
		{
			name: "invalid language",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeQuiz,
				Language:      "klingon",
				Quiz:          &model.QuizChallengeConfig{Difficulty: "medium", QuestionCount: 5},
			},
			wantErr: true,
		},
		{
			name: "quiz missing config",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeQuiz,
				Language:      model.LanguagePT,
			},
			wantErr: true,
		},
		{
			name: "quiz question count above max (5)",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeQuiz,
				Language:      model.LanguagePT,
				Quiz:          &model.QuizChallengeConfig{Difficulty: "medium", QuestionCount: 6},
			},
			wantErr: true,
		},
		{
			name: "quiz question count at max (5) is valid",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeQuiz,
				Language:      model.LanguagePT,
				Quiz:          &model.QuizChallengeConfig{Difficulty: "medium", QuestionCount: 5},
			},
			wantErr: false,
		},
		{
			name: "quiz invalid difficulty",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeQuiz,
				Language:      model.LanguagePT,
				Quiz:          &model.QuizChallengeConfig{Difficulty: "impossible", QuestionCount: 5},
			},
			wantErr: true,
		},
		{
			name: "flashcard missing config",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeFlashcard,
				Language:      model.LanguagePT,
			},
			wantErr: true,
		},
		{
			name: "flashcard card count out of range",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeFlashcard,
				Language:      model.LanguagePT,
				Flashcard:     &model.FlashcardChallengeConfig{CardCount: 0},
			},
			wantErr: true,
		},
		{
			name: "true/false missing config",
			challenger: model.Challenger{
				ChallengeType: model.ChallengeTypeTrueFalse,
				Language:      model.LanguagePT,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateChallenger(tt.challenger)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateChallenger() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
