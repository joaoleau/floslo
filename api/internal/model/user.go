package model

import (
	"time"
	"strings"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type User struct {
	PK       string `dynamodbav:"PK"`
	SK       string `dynamodbav:"SK"`
	GSI1PK string `dynamodbav:"GSI1PK"`
	GSI1SK string `dynamodbav:"GSI1SK"`
	Id       string `dynamodbav:"id"`
	Username string `dynamodbav:"username"`
	Password string `dynamodbav:"password"`
	Email    string `dynamodbav:"email"`
	CreatedAt time.Time `dynamodbav:"created_at"`
	UpdatedAt time.Time `dynamodbav:"updated_at"`
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

func (u *User) CheckPassword(password string) bool {
	return u.Password == password
}

type UpdateUser struct {
	Username *string `dynamodbav:"username"`
	Email    *string `dynamodbav:"email"`
	Password *string `dynamodbav:"password"`
}