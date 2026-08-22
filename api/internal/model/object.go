package model

import "time"

type Object struct {
	PK           string    `dynamodbav:"PK"`
	SK           string    `dynamodbav:"SK"`
	Id           string    `dynamodbav:"id"`
	UserId       string    `dynamodbav:"user_id"`
	Name         string    `dynamodbav:"name"`
	Key          string    `dynamodbav:"key"`
	Tags         []string  `dynamodbav:"tags"`
	Language     string    `dynamodbav:"language"`
	VectorIds    []string  `dynamodbav:"vector_ids"`
	Status       string    `dynamodbav:"status"`
	ErrorMessage string    `dynamodbav:"error_message"`
	TTL          *int64    `dynamodbav:"ttl"`
	CreatedAt    time.Time `dynamodbav:"created_at"`
	UpdatedAt    time.Time `dynamodbav:"updated_at"`
}

// IsExpired reports whether the object carries a ttl (only ever set by the processor
// on the "failed" status transition) that is already due. DynamoDB's own TTL sweep is
// best-effort and can lag well past the timestamp, so the API treats an expired item as
// already gone instead of relying on physical deletion to hide it.
func (o *Object) IsExpired() bool {
	return o.TTL != nil && *o.TTL <= time.Now().Unix()
}

func (o *Object) SetKeys(userId string) {
	o.PK = "USER#" + userId
	o.SK = "OBJECT#" + o.Id
}
