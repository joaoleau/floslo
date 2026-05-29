package model

import "time"

type Object struct {
	PK string `dynamodbav:"PK"`
	SK string `dynamodbav:"SK"`
	Id        string    `dynamodbav:"id"`
	UserId    string    `dynamodbav:"user_id"`
	Name      string    `dynamodbav:"name"`
	Key string    `dynamodbav:"key"`
	Tags      []string  `dynamodbav:"tags"`
	Language  string    `dynamodbav:"language"`
	CreatedAt time.Time `dynamodbav:"created_at"`
	UpdatedAt time.Time `dynamodbav:"updated_at"`
}

func (o *Object) SetKeys(userId string) {
	o.PK = "USER#" + userId
	o.SK = "OBJECT#" + o.Id
}