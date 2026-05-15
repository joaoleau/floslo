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

type Scheduler struct {
	PK       string `dynamodbav:"PK"`
	SK       string `dynamodbav:"SK"`
	Id string `dynamodbav:"scheduler_id"`
	Name string `dynamodbav:"name"`
	WeekDays []Weekday `dynamodbav:"weekdays"`
	StartTime string `dynamodbav:"start_time"`
	SnoozeDuration int `dynamodbav:"snooze_duration"`
	AlarmSound string `dynamodbav:"alarm_sound"`
	DocumentNames []string `dynamodbav:"document_names"`
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

func (s *Scheduler) SetKeys(username string) {
	s.PK = "USER#" + username
	s.SK = "SCHEDULER#" + s.Id
}

type UpdateScheduler struct {
	Id              string
	Name            *string
	WeekDays        *[]Weekday
	StartTime       *string
	SnoozeDuration  *int
	AlarmSound      *string
	DocumentNames   *[]string
	Enabled         *bool
}