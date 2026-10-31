package model

import (
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"time"
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
	ChallengeTypeMultipleChoice ChallengeType = "MULTIPLE_CHOICE"
	ChallengeTypeTrueFalse      ChallengeType = "TRUE_FALSE"
	ChallengeTypeDiscovery      ChallengeType = "DISCOVERY"
)

var validChallengeTypes = map[ChallengeType]bool{
	ChallengeTypeMultipleChoice: true,
	ChallengeTypeTrueFalse:      true,
	ChallengeTypeDiscovery:      true,
}

func (c ChallengeType) Validate() bool {
	return validChallengeTypes[c]
}

func (c ChallengeType) String() string {
	return string(c)
}

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

type MultipleChoiceChallengeConfig struct {
	QuestionCount int `dynamodbav:"question_count"`
}

type TrueFalseChallengeConfig struct {
	QuestionCount int `dynamodbav:"question_count"`
}

type DiscoveryChallengeConfig struct {
	DiscoveryCount int `dynamodbav:"discovery_count"`
}

type Challenger struct {
	ChallengeType  ChallengeType                  `dynamodbav:"challenge_type"`
	MultipleChoice *MultipleChoiceChallengeConfig `dynamodbav:"multiple_choice,omitempty"`
	TrueFalse      *TrueFalseChallengeConfig      `dynamodbav:"true_false,omitempty"`
	Discovery      *DiscoveryChallengeConfig      `dynamodbav:"discovery,omitempty"`
}

func (c Challenger) ItemCount() int {
	switch c.ChallengeType {
	case ChallengeTypeMultipleChoice:
		if c.MultipleChoice != nil {
			return c.MultipleChoice.QuestionCount
		}
	case ChallengeTypeTrueFalse:
		if c.TrueFalse != nil {
			return c.TrueFalse.QuestionCount
		}
	case ChallengeTypeDiscovery:
		if c.Discovery != nil {
			return c.Discovery.DiscoveryCount
		}
	}
	return 0
}

type Scheduler struct {
	PK           string       `dynamodbav:"PK"`
	SK           string       `dynamodbav:"SK"`
	Id           string       `dynamodbav:"id"`
	Name         string       `dynamodbav:"name"`
	Language     Language     `dynamodbav:"language"`
	WeekDays     []Weekday    `dynamodbav:"weekdays"`
	StartTime    string       `dynamodbav:"start_time"`
	AlarmSound   string       `dynamodbav:"alarm_sound"`
	Vibration    bool         `dynamodbav:"vibration"`
	SoundEnabled *bool        `dynamodbav:"sound_enabled,omitempty"`
	ObjectIds    []string     `dynamodbav:"object_ids"`
	Challengers  []Challenger `dynamodbav:"challengers"`
	Enabled      bool         `dynamodbav:"enabled"`
	CreatedAt    time.Time    `dynamodbav:"created_at"`
	UpdatedAt    time.Time    `dynamodbav:"updated_at"`
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
	Id           string
	Name         *string
	Language     *Language
	WeekDays     *[]Weekday
	StartTime    *string
	AlarmSound   *string
	Vibration    *bool
	SoundEnabled *bool
	ObjectIds    *[]string
	Challengers  *[]Challenger
	Enabled      *bool
}
