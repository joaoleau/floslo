package model

import (
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type SchedulerObjectLink struct {
	PK          string `dynamodbav:"PK"`
	SK          string `dynamodbav:"SK"`
	ObjectId    string `dynamodbav:"object_id"`
	SchedulerId string `dynamodbav:"scheduler_id"`
	UserId      string `dynamodbav:"user_id"`
}

func (s *SchedulerObjectLink) GetKey() map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: s.PK},
		"SK": &types.AttributeValueMemberS{Value: s.SK},
	}
}

func (s *SchedulerObjectLink) SetKeys() {
	s.PK = "USER#" + s.UserId
	s.SK = "OBJECTLINK#" + s.ObjectId + "#SCHEDULER#" + s.SchedulerId
}