package repository

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"github.com/joaoleau/floslo/internal/model"
)

type ObjectRepository struct {
	db    *dynamodb.Client
	table string
}

func NewObjectRepository(db *dynamodb.Client, table string) *ObjectRepository {
	return &ObjectRepository{
		db:    db,
		table: table,
	}
}

func (r *ObjectRepository) GetObjectById(ctx context.Context, userId string, objectId string) (*model.Object, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "OBJECT#" + objectId,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to marshal key: %w",err)
	}

	result, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.table),
		Key:       key,
	})

	if err != nil {
		return nil, fmt.Errorf(
			"failed to get object: %w",
			err,
		)
	}
	if result.Item == nil {
		return nil, fmt.Errorf("object not found")
	}

	var object model.Object
	err = attributevalue.UnmarshalMap(
		result.Item,
		&object,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal object: %w", err)
	}

	return &object, nil
}