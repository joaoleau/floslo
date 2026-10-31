package model

import (
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type User struct {
	PK        string    `dynamodbav:"PK"`
	SK        string    `dynamodbav:"SK"`
	GSI1PK    string    `dynamodbav:"GSI1PK"`
	GSI1SK    string    `dynamodbav:"GSI1SK"`
	Id        string    `dynamodbav:"id"`
	Username  string    `dynamodbav:"username"`
	Password  string    `dynamodbav:"password"`
	Email     string    `dynamodbav:"email"`
	CurrentStreak int `dynamodbav:"current_streak"`
	LastActiveDate string `dynamodbav:"last_active_date"`
	TermsVersion    string    `dynamodbav:"terms_version"`
	TermsAcceptedAt time.Time `dynamodbav:"terms_accepted_at"`
	CreatedAt       time.Time `dynamodbav:"created_at"`
	UpdatedAt       time.Time `dynamodbav:"updated_at"`
}

func (u *User) GetKey() map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: u.PK},
		"SK": &types.AttributeValueMemberS{Value: u.SK},
	}
}

func (u *User) SetKeys() {
	u.PK = "USER#" + u.Id
	u.SK = "PROFILE"

	u.GSI1PK = "USERNAME#" + strings.ToLower(u.Username)
	u.GSI1SK = "PROFILE"
}

type UpdateUser struct {
	Username        *string `dynamodbav:"username"`
	Password        *string `dynamodbav:"password"`
	CurrentPassword *string `dynamodbav:"-"`
}

type EmailLookup struct {
	PK     string `dynamodbav:"PK"`
	SK     string `dynamodbav:"SK"`
	UserId string `dynamodbav:"user_id"`
}

func NewEmailLookup(email string, userId string) *EmailLookup {
	return &EmailLookup{
		PK:     "EMAIL#" + strings.ToLower(email),
		SK:     "LOOKUP",
		UserId: userId,
	}
}

func EmailLookupKey(email string) map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: "EMAIL#" + strings.ToLower(email)},
		"SK": &types.AttributeValueMemberS{Value: "LOOKUP"},
	}
}
