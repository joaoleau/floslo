package model

import (
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// UserStats is a single aggregate item per user (SK = "STATS", same table/PK
// pattern as User/Scheduler) -- streak + answered-by-type counts, reported by the
// mobile app once per answered challenge (see service.UserStatsService.RecordAnswer).
// Deliberately not per-tag: that's exactly the high-cardinality write pattern that
// pushed per-attempt history into local SQLite in the first place.
type UserStats struct {
	PK             string         `dynamodbav:"PK"`
	SK             string         `dynamodbav:"SK"`
	UserId         string         `dynamodbav:"user_id"`
	CurrentStreak  int            `dynamodbav:"current_streak"`
	// "YYYY-MM-DD" in the user's local timezone, as reported by the client -- the
	// server has no reliable way to know the user's timezone on its own.
	LastActiveDate string         `dynamodbav:"last_active_date"`
	AnsweredByType map[string]int `dynamodbav:"answered_by_type"`
}

func (s *UserStats) GetKey() map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: s.PK},
		"SK": &types.AttributeValueMemberS{Value: s.SK},
	}
}

func (s *UserStats) SetKeys(userId string) {
	s.PK = "USER#" + userId
	s.SK = "STATS"
}
