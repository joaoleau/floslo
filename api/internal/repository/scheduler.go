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
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/config/logger"
)

type SchedulerRepository struct {
	db        *dynamodb.Client
	table string
}

func NewSchedulerRepository(db *dynamodb.Client, table string) *SchedulerRepository {
	return &SchedulerRepository{
		db:        db,
		table: table,
	}
}

func (r *SchedulerRepository) NewScheduler(ctx context.Context, scheduler *model.Scheduler) error {
	item, err := attributevalue.MarshalMap(scheduler)
	if err != nil {
		logger.Log.Error("failed to marshal scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal scheduler: %w", err)
	}
	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      item,
		ConditionExpression: aws.String("attribute_not_exists(SK)"),
	})
	if err != nil {
		logger.Log.Error("failed to put item: ", logger.Any("error", err))
		return fmt.Errorf("failed to put item: %w", err)
	}
	
	logger.Log.Info("scheduler created: ", logger.String("scheduler_id", scheduler.Id))
	return nil
}

func (r *SchedulerRepository) ListSchedulers(ctx context.Context, userId string) ([]*model.Scheduler, error) {
	keyCond := expression.Key("PK").Equal(expression.Value("USER#" + userId)).And(
		expression.Key("SK").BeginsWith("SCHEDULER#"),
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
	var schedulers []*model.Scheduler
	for _, item := range result.Items {
		var scheduler model.Scheduler
		err = attributevalue.UnmarshalMap(item, &scheduler)
		if err != nil {
			logger.Log.Error("failed to unmarshal scheduler: ", logger.Any("error", err))
			return nil, fmt.Errorf("failed to unmarshal scheduler: %w", err)
		}
		schedulers = append(schedulers, &scheduler)
	}
	
	logger.Log.Info("schedulers found: ", logger.Any("count", len(schedulers)))
	return schedulers, nil
}

func (r *SchedulerRepository) GetSchedulerById(ctx context.Context, userId string, schedulerId string) (*model.Scheduler, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "SCHEDULER#" + schedulerId,
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
		logger.Log.Error("scheduler not found", logger.Any("scheduler_id", schedulerId))
		return nil, fmt.Errorf("scheduler not found")
	}
	var scheduler model.Scheduler
	err = attributevalue.UnmarshalMap(result.Item, &scheduler)
	if err != nil {
		logger.Log.Error("failed to unmarshal scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal scheduler: %w", err)
	}
	
	logger.Log.Info("scheduler found: ", logger.String("scheduler_id", scheduler.Id))
	return &scheduler, nil
}

func (r *SchedulerRepository) UpdateScheduler(ctx context.Context, scheduler *model.Scheduler) (*model.Scheduler, error) {
	update := expression.Set(expression.Name("name"), expression.Value(scheduler.Name)).
		Set(expression.Name("weekdays"), expression.Value(scheduler.WeekDays)).
		Set(expression.Name("start_time"), expression.Value(scheduler.StartTime)).
		Set(expression.Name("alarm_sound"), expression.Value(scheduler.AlarmSound)).
		Set(expression.Name("vibration"), expression.Value(scheduler.Vibration)).
		Set(expression.Name("sound_enabled"), expression.Value(scheduler.SoundEnabled)).
		Set(expression.Name("object_ids"), expression.Value(scheduler.ObjectIds)).
		Set(expression.Name("challengers"), expression.Value(scheduler.Challengers)).
		Set(expression.Name("enabled"), expression.Value(scheduler.Enabled)).
		Set(expression.Name("updated_at"), expression.Value(time.Now().UTC().Format(time.RFC3339)))
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		logger.Log.Error("failed to build expression: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to build expression: %w", err)
	}
	response, err := r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                 aws.String(r.table),
		Key:                       scheduler.GetKey(),
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		// UPDATED_NEW only returns the attributes present in the Set expression above — Id
		// (derived from SK, never part of the update set) and CreatedAt come back empty,
		// which is exactly the bug that made every edited scheduler report an empty id to
		// the client. ALL_NEW returns the complete item after the update.
		ReturnValues: types.ReturnValueAllNew,
	})
	if err != nil {
		logger.Log.Error("failed to update item: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	var updatedScheduler model.Scheduler
	err = attributevalue.UnmarshalMap(response.Attributes, &updatedScheduler)
	if err != nil {
		logger.Log.Error("failed to unmarshal updated scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal updated scheduler: %w", err)
	}
	
	logger.Log.Info("scheduler updated: ", logger.String("scheduler_id", updatedScheduler.Id))
	return &updatedScheduler, nil
}

func (r *SchedulerRepository) DeleteScheduler(ctx context.Context, userId string, schedulerId string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "SCHEDULER#" + schedulerId,
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
	logger.Log.Info("scheduler deleted: ", logger.String("scheduler_id", schedulerId))
	return nil
}