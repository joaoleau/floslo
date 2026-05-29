package repository

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/joaoleau/floslo/internal/model"
)


type SchedulerObjectLinkRepository struct {
	db    *dynamodb.Client
	table string
}

func NewSchedulerObjectLinkRepository(db *dynamodb.Client,	table string) *SchedulerObjectLinkRepository {
	return &SchedulerObjectLinkRepository{
		db:    db,
		table: table,
	}
}

func (r *SchedulerObjectLinkRepository) CreateLink(ctx context.Context,	link *model.SchedulerObjectLink,) error {
	item, err := attributevalue.MarshalMap(link)
	if err != nil {
		return fmt.Errorf("failed to marshal link: %w", err)
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      item,

		ConditionExpression: aws.String("attribute_not_exists(SK)"),
	})

	if err != nil {
		return fmt.Errorf("failed to create link: %w", err)
	}

	return nil
}

func (r *SchedulerObjectLinkRepository) ListByObjectID(ctx context.Context, userId string, objectId string) ([]*model.SchedulerObjectLink, error) {

	keyCond := expression.Key("PK").Equal(
		expression.Value("USER#" + userId),
	).And(
		expression.Key("SK").BeginsWith(
			"OBJECTLINK#" + objectId + "#",
		),
	)
	
	expr, err := expression.NewBuilder().WithKeyCondition(keyCond).Build()

	if err != nil {
		return nil, fmt.Errorf("failed to build expression: %w", err)
	}

	result, err := r.db.Query(ctx, &dynamodb.QueryInput{
		TableName:                 aws.String(r.table),
		KeyConditionExpression:    expr.KeyCondition(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to query links: %w", err)
	}

	var links []*model.SchedulerObjectLink

	for _, item := range result.Items {
		var link model.SchedulerObjectLink

		err = attributevalue.UnmarshalMap(item, &link)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal link: %w", err)
		}

		links = append(links, &link)
	}

	return links, nil
}

func (r *SchedulerObjectLinkRepository) DeleteLink(ctx context.Context,	userId,	objectId, schedulerId string,) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "OBJECTLINK#" + objectId + "#SCHEDULER#" + schedulerId,
	})

	if err != nil {
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	_, err = r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.table),
		Key:       key,
	})

	if err != nil {
		return fmt.Errorf("failed to delete link: %w", err)
	}

	return nil
}