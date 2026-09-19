package repository

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
)

type PasswordResetRepository struct {
	db    *dynamodb.Client
	table string
}

func NewPasswordResetRepository(db *dynamodb.Client, table string) *PasswordResetRepository {
	return &PasswordResetRepository{
		db:    db,
		table: table,
	}
}

func (r *PasswordResetRepository) Save(ctx context.Context, code *model.PasswordResetCode) error {
	item, err := attributevalue.MarshalMap(code)
	if err != nil {
		logger.Log.Error("failed to marshal password reset code: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal password reset code: %w", err)
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      item,
	})
	if err != nil {
		logger.Log.Error("failed to put password reset code: ", logger.Any("error", err))
		return fmt.Errorf("failed to put password reset code: %w", err)
	}
	return nil
}

func (r *PasswordResetRepository) Get(ctx context.Context, userId string) (*model.PasswordResetCode, error) {
	result, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.table),
		Key:       model.PasswordResetCodeKey(userId),
	})
	if err != nil {
		logger.Log.Error("failed to get password reset code: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get password reset code: %w", err)
	}
	if result.Item == nil {
		return nil, fmt.Errorf("password reset code not found")
	}

	var code model.PasswordResetCode
	if err := attributevalue.UnmarshalMap(result.Item, &code); err != nil {
		logger.Log.Error("failed to unmarshal password reset code: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal password reset code: %w", err)
	}
	return &code, nil
}

func (r *PasswordResetRepository) Delete(ctx context.Context, userId string) error {
	_, err := r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.table),
		Key:       model.PasswordResetCodeKey(userId),
	})
	if err != nil {
		logger.Log.Error("failed to delete password reset code: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete password reset code: %w", err)
	}
	return nil
}
