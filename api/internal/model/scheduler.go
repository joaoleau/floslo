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

type QuizChallengeConfig struct {
	Difficulty    string `dynamodbav:"difficulty"`
	QuestionCount int    `dynamodbav:"question_count"`
}

type Challenger struct {
	ChallengeType string              `dynamodbav:"challenge_type"`
	Challenge     QuizChallengeConfig `dynamodbav:"challenge"`
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
	ObjectIds   *[]string
	Challengers *[]Challenger
	Enabled         *bool
}