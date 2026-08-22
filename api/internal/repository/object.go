package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/joaoleau/floslo/internal/config/logger"
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

	// DynamoDB's TTL sweep is best-effort and can lag well past the expiry timestamp,
	// so a "failed" object past its ttl is treated as already gone here instead of
	// waiting on physical deletion to hide it.
	if object.IsExpired() {
		return nil, fmt.Errorf("object not found")
	}

	return &object, nil
}

func (r *ObjectRepository) ListObjectsByUser(ctx context.Context, userId string) ([]*model.Object, error) {
	keyCond := expression.Key("PK").Equal(expression.Value("USER#" + userId)).And(
		expression.Key("SK").BeginsWith("OBJECT#"),
	)
	expr, err := expression.NewBuilder().WithKeyCondition(keyCond).Build()
	if err != nil {
		logger.Log.Error("failed to build expression: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to build expression: %w", err)
	}
	result, err := r.db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.table),
		KeyConditionExpression: expr.KeyCondition(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
	})
	if err != nil {
		logger.Log.Error("failed to query items: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to query items: %w", err)
	}
	var objects []*model.Object
	for _, item := range result.Items {
		var object model.Object
		err = attributevalue.UnmarshalMap(item, &object)
		if err != nil {
			logger.Log.Error("failed to unmarshal object: ", logger.Any("error", err))
			return nil, fmt.Errorf("failed to unmarshal object: %w", err)
		}
		// See the comment in GetObjectById: hide expired "failed" objects here rather
		// than relying on DynamoDB's best-effort TTL sweep to have deleted them yet.
		if object.IsExpired() {
			continue
		}
		objects = append(objects, &object)
	}

	logger.Log.Info("objects found: ", logger.Any("count", len(objects)))
	return objects, nil
}

func (r *ObjectRepository) UpdateObjectTags(ctx context.Context, userId string, objectId string, tags []string) (*model.Object, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "OBJECT#" + objectId,
	})
	if err != nil {
		logger.Log.Error("failed to marshal key: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to marshal key: %w", err)
	}

	update := expression.Set(expression.Name("tags"), expression.Value(tags)).
		Set(expression.Name("updated_at"), expression.Value(time.Now().UTC().Format(time.RFC3339)))
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		logger.Log.Error("failed to build expression: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to build expression: %w", err)
	}
	response, err := r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                 aws.String(r.table),
		Key:                       key,
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		// UPDATED_NEW only returns attributes present in the Set expression above — Id, name,
		// extension, status etc. come back empty since they're not part of this update. ALL_NEW
		// returns the complete item. Same bug fixed in scheduler.go's UpdateScheduler.
		ReturnValues: types.ReturnValueAllNew,
	})
	if err != nil {
		logger.Log.Error("failed to update item: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	var updatedObject model.Object
	err = attributevalue.UnmarshalMap(response.Attributes, &updatedObject)
	if err != nil {
		logger.Log.Error("failed to unmarshal updated object: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal updated object: %w", err)
	}

	logger.Log.Info("object updated: ", logger.String("object_id", objectId))
	return &updatedObject, nil
}

func (r *ObjectRepository) DeleteObjectById(ctx context.Context, userId string, objectId string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "OBJECT#" + objectId,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	_, err = r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.table),
		Key:       key,
	})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	return nil
}