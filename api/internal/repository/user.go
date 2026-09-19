package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
)

type UserRepository struct {
	db    *dynamodb.Client
	table string
}

func NewUserRepository(db *dynamodb.Client, table string) *UserRepository {
	return &UserRepository{
		db:    db,
		table: table,
	}
}

func (r *UserRepository) NewUser(ctx context.Context, user *model.User) error {
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		logger.Log.Error("failed to marshal user: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	existing, _ := r.GetUserByUsername(ctx, user.Username)
	if existing != nil {
		return fmt.Errorf("username already exists")
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.table),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(PK)"),
	})
	if err != nil {
		logger.Log.Error("failed to put item: ", logger.Any("error", err))
		return fmt.Errorf("failed to put item: %w", err)
	}

	logger.Log.Info("user created: ", logger.String("user_id", user.Id))
	return nil
}

func (r *UserRepository) GetUserByUserId(ctx context.Context, user_id string) (*model.User, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + user_id,
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
		logger.Log.Error("user not found", logger.Any("user_id", user_id))
		return nil, fmt.Errorf("user not found")
	}
	var user model.User
	err = attributevalue.UnmarshalMap(result.Item, &user)
	if err != nil {
		logger.Log.Error("failed to unmarshal user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	logger.Log.Info("user found: ", logger.String("user_id", user.Id))
	return &user, nil
}

func (r *UserRepository) GetUserByUsername(ctx context.Context, username string) (*model.User, error) {
	username = strings.ToLower(username)

	result, err := r.db.Query(ctx, &dynamodb.QueryInput{
		TableName: aws.String(r.table),
		IndexName: aws.String("GSI1"),

		KeyConditionExpression: aws.String("GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk"),

		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: "USERNAME#" + username,
			},
			":gsi1sk": &types.AttributeValueMemberS{
				Value: "PROFILE",
			},
		},

		Limit: aws.Int32(1),
	})
	if err != nil {
		logger.Log.Error("failed to query user by username",
			logger.Any("error", err),
		)

		return nil, fmt.Errorf("failed to query user by username: %w", err)
	}

	if len(result.Items) == 0 {
		logger.Log.Error("user not found",
			logger.String("username", username),
		)

		return nil, fmt.Errorf("user not found")
	}

	var user model.User

	err = attributevalue.UnmarshalMap(result.Items[0], &user)
	if err != nil {
		logger.Log.Error("failed to unmarshal user",
			logger.Any("error", err),
		)

		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	logger.Log.Info("user found",
		logger.String("user_id", user.Id),
		logger.String("username", user.Username),
	)

	return &user, nil
}

func (r *UserRepository) SaveEmailLookup(ctx context.Context, lookup *model.EmailLookup) error {
	item, err := attributevalue.MarshalMap(lookup)
	if err != nil {
		logger.Log.Error("failed to marshal email lookup: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal email lookup: %w", err)
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      item,
	})
	if err != nil {
		logger.Log.Error("failed to put email lookup: ", logger.Any("error", err))
		return fmt.Errorf("failed to put email lookup: %w", err)
	}
	return nil
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	result, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.table),
		Key:       model.EmailLookupKey(email),
	})
	if err != nil {
		logger.Log.Error("failed to get email lookup: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get email lookup: %w", err)
	}
	if result.Item == nil {
		return nil, fmt.Errorf("user not found")
	}

	var lookup model.EmailLookup
	if err := attributevalue.UnmarshalMap(result.Item, &lookup); err != nil {
		logger.Log.Error("failed to unmarshal email lookup: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal email lookup: %w", err)
	}

	return r.GetUserByUserId(ctx, lookup.UserId)
}

func (r *UserRepository) DeleteEmailLookup(ctx context.Context, email string) error {
	_, err := r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.table),
		Key:       model.EmailLookupKey(email),
	})
	if err != nil {
		logger.Log.Error("failed to delete email lookup: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete email lookup: %w", err)
	}
	return nil
}

func (r *UserRepository) UpdateUserByUserId(ctx context.Context, user_id string, user *model.User) (*model.User, error) {
	update := expression.Set(expression.Name("password"), expression.Value(user.Password)).
		Set(expression.Name("email"), expression.Value(user.Email)).
		Set(expression.Name("username"), expression.Value(user.Username)).
		Set(expression.Name("GSI1PK"), expression.Value("USERNAME#"+strings.ToLower(user.Username))).
		Set(expression.Name("GSI1SK"), expression.Value("PROFILE"))
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
		ReturnValues:              types.ReturnValueAllNew,
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

	logger.Log.Info("user updated: ", logger.String("user_id", updatedUser.Id))
	return &updatedUser, nil
}

// UpdateStreak só toca current_streak/last_active_date -- não precisa (nem deve) passar
// pelo resto do UpdateUserByUserId, que reescreve username/email/senha/GSI1 junto.
func (r *UserRepository) UpdateStreak(ctx context.Context, userId string, currentStreak int, lastActiveDate string) (*model.User, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "PROFILE",
	})
	if err != nil {
		logger.Log.Error("failed to marshal key: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to marshal key: %w", err)
	}

	update := expression.Set(expression.Name("current_streak"), expression.Value(currentStreak)).
		Set(expression.Name("last_active_date"), expression.Value(lastActiveDate))
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
		ReturnValues:              types.ReturnValueAllNew,
	})
	if err != nil {
		logger.Log.Error("failed to update item: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	var updatedUser model.User
	if err := attributevalue.UnmarshalMap(response.Attributes, &updatedUser); err != nil {
		logger.Log.Error("failed to unmarshal updated user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal updated user: %w", err)
	}

	return &updatedUser, nil
}

func (r *UserRepository) DeleteUserByUserId(ctx context.Context, user_id string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + user_id,
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
	logger.Log.Info("user deleted: ", logger.String("user_id", user_id))
	return nil
}
