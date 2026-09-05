package model

import (
	"time"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type Weekday string

const (
	Monday    Weekday = "MON"
	Tuesday   Weekday = "TUE"
	Wednesday Weekday = "WED"
	Thursday  Weekday = "THU"
	Friday    Weekday = "FRI"
	Saturday  Weekday = "SAT"
	Sunday    Weekday = "SUN"
)

var validWeekdays = map[Weekday]bool{
	Monday:    true,
	Tuesday:   true,
	Wednesday: true,
	Thursday:  true,
	Friday:    true,
	Saturday:  true,
	Sunday:    true,
}

func (w Weekday) Validate() bool {
	return validWeekdays[w]
}

func (w Weekday) String() string {
	return string(w)
}

type ChallengeType string

const (
	ChallengeTypeQuiz      ChallengeType = "QUIZ"
	ChallengeTypeFlashcard ChallengeType = "FLASHCARD"
	ChallengeTypeTrueFalse ChallengeType = "TRUE_FALSE"
)

var validChallengeTypes = map[ChallengeType]bool{
	ChallengeTypeQuiz:      true,
	ChallengeTypeFlashcard: true,
	ChallengeTypeTrueFalse: true,
}

func (c ChallengeType) Validate() bool {
	return validChallengeTypes[c]
}

func (c ChallengeType) String() string {
	return string(c)
}

// Language is the challenge's output/content language. Keep this set in sync with
// api/processor/services/tag.py's SUPPORTED_LANGUAGES and mobile's SUPPORTED_LANGUAGES
// (src/types/domain/Scheduler.ts) -- there is no shared package between the three.
type Language string

const (
	LanguagePT Language = "pt"
	LanguageEN Language = "en"
	LanguageES Language = "es"
	LanguageFR Language = "fr"
	LanguageDE Language = "de"
	LanguageIT Language = "it"
)

var validLanguages = map[Language]bool{
	LanguagePT: true,
	LanguageEN: true,
	LanguageES: true,
	LanguageFR: true,
	LanguageDE: true,
	LanguageIT: true,
}

func (l Language) Validate() bool {
	return validLanguages[l]
}

func (l Language) String() string {
	return string(l)
}

type QuizChallengeConfig struct {
	Difficulty    string `dynamodbav:"difficulty"`
	QuestionCount int    `dynamodbav:"question_count"`
}

type FlashcardChallengeConfig struct {
	CardCount int `dynamodbav:"card_count"`
}

type TrueFalseChallengeConfig struct {
	Difficulty    string `dynamodbav:"difficulty"`
	QuestionCount int    `dynamodbav:"question_count"`
}

// Challenger holds exactly one of Quiz/Flashcard/TrueFalse, selected by ChallengeType.
// Only one config pointer should be non-nil at a time -- SchedulerService.validateChallenger
// enforces this on write; adding a new challenge type means one more ChallengeType const,
// one more *Config pointer field, and one more switch case, nothing else restructures.
type Challenger struct {
	ChallengeType ChallengeType             `dynamodbav:"challenge_type"`
	Language      Language                  `dynamodbav:"language"`
	Quiz          *QuizChallengeConfig      `dynamodbav:"quiz,omitempty"`
	Flashcard     *FlashcardChallengeConfig `dynamodbav:"flashcard,omitempty"`
	TrueFalse     *TrueFalseChallengeConfig `dynamodbav:"true_false,omitempty"`
}

type Scheduler struct {
	PK       string `dynamodbav:"PK"`
	SK       string `dynamodbav:"SK"`
	Id string `dynamodbav:"id"`
	Name string `dynamodbav:"name"`
	WeekDays []Weekday `dynamodbav:"weekdays"`
	StartTime string `dynamodbav:"start_time"`
	AlarmSound string `dynamodbav:"alarm_sound"`
	Vibration bool `dynamodbav:"vibration"`
	// Ponteiro (não bool puro) de propósito: nil diferencia "nunca setado" (schedulers
	// criados antes desse campo existir) de "setado como false" -- o fallback pro
	// comportamento antigo implícito (ver dto.ToSchedulerResponseDTOList) depende disso.
	SoundEnabled *bool `dynamodbav:"sound_enabled,omitempty"`
	ObjectIds []string `dynamodbav:"object_ids"`
	Challengers []Challenger `dynamodbav:"challengers"`
	Enabled bool `dynamodbav:"enabled"`
	CreatedAt time.Time `dynamodbav:"created_at"`
	UpdatedAt time.Time `dynamodbav:"updated_at"`
}

func (s *Scheduler) GetKey() map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: s.PK},
		"SK": &types.AttributeValueMemberS{Value: s.SK},
	}
}

func (s *Scheduler) SetKeys(userId string) {
	s.PK = "USER#" + userId
	s.SK = "SCHEDULER#" + s.Id
}

type UpdateScheduler struct {
	Id              string
	Name            *string
	WeekDays        *[]Weekday
	StartTime       *string
	AlarmSound      *string
	Vibration       *bool
	SoundEnabled    *bool
	ObjectIds   *[]string
	Challengers *[]Challenger
	Enabled         *bool
}