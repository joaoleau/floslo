package service

import (
	"testing"

	"github.com/joaoleau/floslo/internal/model"
)

func multipleChoiceChallenger(count int) model.Challenger {
	return model.Challenger{
		ChallengeType:  model.ChallengeTypeMultipleChoice,
		MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: count},
	}
}

func trueFalseChallenger(count int) model.Challenger {
	return model.Challenger{
		ChallengeType: model.ChallengeTypeTrueFalse,
		TrueFalse:     &model.TrueFalseChallengeConfig{QuestionCount: count},
	}
}

func discoveryChallenger(count int) model.Challenger {
	return model.Challenger{
		ChallengeType: model.ChallengeTypeDiscovery,
		Discovery:     &model.DiscoveryChallengeConfig{DiscoveryCount: count},
	}
}

func TestValidateChallenger(t *testing.T) {
	tests := []struct {
		name       string
		challenger model.Challenger
		wantErr    bool
	}{
		{name: "valid multiple choice", challenger: multipleChoiceChallenger(5)},
		{name: "valid true/false", challenger: trueFalseChallenger(3)},
		{name: "valid discovery", challenger: discoveryChallenger(2)},
		{
			name:       "unknown challenge type",
			challenger: model.Challenger{ChallengeType: "MATCHING"},
			wantErr:    true,
		},
		{
			name:       "multiple choice missing config",
			challenger: model.Challenger{ChallengeType: model.ChallengeTypeMultipleChoice},
			wantErr:    true,
		},
		{
			name:       "flashcard is no longer a challenge type",
			challenger: model.Challenger{ChallengeType: "FLASHCARD"},
			wantErr:    true,
		},
		{
			name:       "true/false missing config",
			challenger: model.Challenger{ChallengeType: model.ChallengeTypeTrueFalse},
			wantErr:    true,
		},
		{
			name:       "discovery missing config",
			challenger: model.Challenger{ChallengeType: model.ChallengeTypeDiscovery},
			wantErr:    true,
		},
		{name: "count of zero", challenger: trueFalseChallenger(0), wantErr: true},
		{name: "negative count", challenger: multipleChoiceChallenger(-1), wantErr: true},
		{name: "count at the max is valid", challenger: multipleChoiceChallenger(MaxItemsPerScheduler)},
		{name: "count above the max", challenger: multipleChoiceChallenger(MaxItemsPerScheduler + 1), wantErr: true},
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

func TestValidateChallengers(t *testing.T) {
	tests := []struct {
		name        string
		challengers []model.Challenger
		wantErr     bool
	}{
		{name: "no challengers", challengers: nil},
		{name: "one challenger", challengers: []model.Challenger{multipleChoiceChallenger(3)}},
		{
			name:        "total exactly at the limit",
			challengers: []model.Challenger{trueFalseChallenger(4), multipleChoiceChallenger(6)},
		},
		{
			name:        "total one above the limit",
			challengers: []model.Challenger{trueFalseChallenger(5), multipleChoiceChallenger(6)},
			wantErr:     true,
		},
		{
			name:        "three types adding up above the limit",
			challengers: []model.Challenger{multipleChoiceChallenger(4), trueFalseChallenger(4), discoveryChallenger(3)},
			wantErr:     true,
		},
		{
			name:        "all three types within the limit",
			challengers: []model.Challenger{multipleChoiceChallenger(3), trueFalseChallenger(4), discoveryChallenger(3)},
		},
		{
			name:        "one invalid challenger fails the whole list",
			challengers: []model.Challenger{multipleChoiceChallenger(2), discoveryChallenger(0)},
			wantErr:     true,
		},
		{
			name:        "no type is required",
			challengers: []model.Challenger{discoveryChallenger(10)},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateChallengers(tt.challengers)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateChallengers() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateLanguage(t *testing.T) {
	for _, language := range []model.Language{
		model.LanguagePT, model.LanguageEN, model.LanguageES, model.LanguageFR, model.LanguageDE, model.LanguageIT,
	} {
		if err := validateLanguage(language); err != nil {
			t.Errorf("validateLanguage(%q) returned %v, want nil", language, err)
		}
	}

	for _, language := range []model.Language{"", "klingon", "PT"} {
		if err := validateLanguage(language); err == nil {
			t.Errorf("validateLanguage(%q) should return an error", language)
		}
	}
}

func TestChallengerItemCount(t *testing.T) {
	tests := []struct {
		name       string
		challenger model.Challenger
		want       int
	}{
		{name: "multiple choice", challenger: multipleChoiceChallenger(3), want: 3},
		{name: "true/false", challenger: trueFalseChallenger(2), want: 2},
		{name: "discovery", challenger: discoveryChallenger(5), want: 5},
		{name: "missing config", challenger: model.Challenger{ChallengeType: model.ChallengeTypeMultipleChoice}, want: 0},
		{name: "unknown type", challenger: model.Challenger{ChallengeType: "MATCHING"}, want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.challenger.ItemCount(); got != tt.want {
				t.Errorf("ItemCount() = %d, want %d", got, tt.want)
			}
		})
	}
}
