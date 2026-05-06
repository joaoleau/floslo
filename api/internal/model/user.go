package model

import (
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type User struct {
	PK       string `dynamodbav:"PK"`
	SK       string `dynamodbav:"SK"`
	Username string `dynamodbav:"username"`
	Password string `dynamodbav:"password"`
	Email    string `dynamodbav:"email"`
}

func (u *User) GetKey() map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: u.PK},
		"SK": &types.AttributeValueMemberS{Value: u.SK},
	}
}

func (u *User) SetKeys() error {
	u.PK = "USER#" + u.Username
	u.SK = "PROFILE"

	return nil
}

func (u *User) CheckPassword(password string) bool {
	return u.Password == password
}