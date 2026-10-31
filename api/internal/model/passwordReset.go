package model

import (
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type PasswordResetCode struct {
	PK        string    `dynamodbav:"PK"`
	SK        string    `dynamodbav:"SK"`
	UserId    string    `dynamodbav:"user_id"`
	CodeHash  string    `dynamodbav:"code_hash"`
	ExpiresAt int64     `dynamodbav:"expires_at"`
	TTL       int64     `dynamodbav:"ttl"`
	CreatedAt time.Time `dynamodbav:"created_at"`
}

func PasswordResetCodeKey(userId string) map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: "USER#" + userId},
		"SK": &types.AttributeValueMemberS{Value: "PWRESET"},
	}
}

func (p *PasswordResetCode) SetKeys() {
	p.PK = "USER#" + p.UserId
	p.SK = "PWRESET"
}

func (p *PasswordResetCode) IsExpired() bool {
	return time.Now().UTC().Unix() > p.ExpiresAt
}
