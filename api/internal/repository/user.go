package repository

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/config/logger"
)

type UserRepository struct {
	db        *dynamodb.Client
	table string
}

func NewUserRepository(db *dynamodb.Client, table string) *UserRepository {
	return &UserRepository{
		db:        db,
		table: table,
	}
}

func (r *UserRepository) NewUser (ctx context.Context, user *model.User) error {
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		logger.Log.Error("failed to marshal user: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal user: %w", err)
	}
	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      item,
		ConditionExpression: aws.String("attribute_not_exists(PK)"),
	})
	if err != nil {
		logger.Log.Error("failed to put item: ", logger.Any("error", err))
		return fmt.Errorf("failed to put item: %w", err)
	}
	
	logger.Log.Info("user created: ", logger.String("username", user.Username))
	return nil
}

func (r *UserRepository) GetUserByUsername (ctx context.Context, username string) (*model.User, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + username,
		"SK": "PROFILE",
	})
	if err != nil {
		logger.Log.Error("failed to marshal key: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to marshal key: %w", err)
	}
	result, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.table),
		Key:       key,
	})
	if err != nil {
		logger.Log.Error("failed to get item: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get item: %w", err)
	}
	if result.Item == nil {
		logger.Log.Error("user not found", logger.Any("username", username))
		return nil, fmt.Errorf("user not found")
	}
	var user model.User
	err = attributevalue.UnmarshalMap(result.Item, &user)
	if err != nil {
		logger.Log.Error("failed to unmarshal user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}
	
	logger.Log.Info("user found: ", logger.String("username", user.Username))
	return &user, nil
}

func (r *UserRepository) UpdateUserByUsername (ctx context.Context, username string, user *model.User) (*model.User, error) {
	update := expression.Set(expression.Name("password"), expression.Value(user.Password)).
		Set(expression.Name("email"), expression.Value(user.Email))
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		logger.Log.Error("failed to build expression: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to build expression: %w", err)
	}
	response, err := r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                 aws.String(r.table),
		Key:                       user.GetKey(),
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		ReturnValues:              types.ReturnValueUpdatedNew,
	})
	if err != nil {
		logger.Log.Error("failed to update item: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	var updatedUser model.User
	err = attributevalue.UnmarshalMap(response.Attributes, &updatedUser)
	if err != nil {
		logger.Log.Error("failed to unmarshal updated user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal updated user: %w", err)
	}
	
	logger.Log.Info("user updated: ", logger.String("username", updatedUser.Username))
	return &updatedUser, nil
}

func (r *UserRepository) DeleteUserByUsername (ctx context.Context, username string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + username,
		"SK": "PROFILE",
	})
	if err != nil {
		logger.Log.Error("failed to marshal key: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal key: %w", err)
	}
	_, err = r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.table),
		Key:       key,
	})
	if err != nil {
		logger.Log.Error("failed to delete item: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete item: %w", err)
	}
	logger.Log.Info("user deleted: ", logger.String("username", username))
	return nil
}