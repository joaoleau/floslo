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
	// Sequência de dias em que o usuário respondeu pelo menos um desafio -- vive direto
	// no item do usuário (não num item STATS separado): é o único agregado que ainda
	// importa manter, e sobrevive à troca de aparelho porque é o backend quem decide
	// (não o SQLite local, que é por dispositivo e só guarda um histórico curto).
	CurrentStreak int `dynamodbav:"current_streak"`
	// "YYYY-MM-DD" no fuso local de quem reportou por último -- mesmo raciocínio do
	// antigo PasswordResetCode/UserStats: o servidor não tem como saber o fuso do
	// usuário sozinho.
	LastActiveDate string    `dynamodbav:"last_active_date"`
	CreatedAt      time.Time `dynamodbav:"created_at"`
	UpdatedAt      time.Time `dynamodbav:"updated_at"`
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
