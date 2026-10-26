package repository

import (
	"context"
	"errors"
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

// ErrSchedulerNotFound deixa "não encontrei o agendador" distinguível de qualquer outro
// erro de infra -- quem chama (ex.: limpeza de vínculos ao excluir um objeto) precisa
// tratar diferente um agendador já excluído (ok, ignora) de uma falha real do Dynamo
// (deve propagar).
var ErrSchedulerNotFound = errors.New("scheduler not found")

type SchedulerRepository struct {
	db    *dynamodb.Client
	table string
}

func NewSchedulerRepository(db *dynamodb.Client, table string) *SchedulerRepository {
	return &SchedulerRepository{
		db:    db,
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
		TableName:           aws.String(r.table),
		Item:                item,
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
		TableName:                 aws.String(r.table),
		KeyConditionExpression:    expr.KeyCondition(),
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
		return nil, ErrSchedulerNotFound
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
		Set(expression.Name("language"), expression.Value(scheduler.Language)).
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
		ReturnValues:              types.ReturnValueAllNew,
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

// RemoveObjectId tira um objectId de object_ids sem tocar no resto do agendador --
// usado na exclusão de um objeto, pra limpar toda referência a ele. Se o agendador já
// não existe (ErrSchedulerNotFound) ou já não referencia esse objeto, não faz nada e
// retorna sem erro: nenhum dos dois casos é um problema real pra quem chamou. O retorno
// é quantos object_ids sobraram, pra quem chamou saber se o agendador ficou vazio sem
// precisar buscá-lo de novo.
func (r *SchedulerRepository) RemoveObjectId(ctx context.Context, userId string, schedulerId string, objectId string) (int, error) {
	scheduler, err := r.GetSchedulerById(ctx, userId, schedulerId)
	if err != nil {
		return 0, err
	}

	updatedIds := make([]string, 0, len(scheduler.ObjectIds))
	for _, id := range scheduler.ObjectIds {
		if id != objectId {
			updatedIds = append(updatedIds, id)
		}
	}
	if len(updatedIds) == len(scheduler.ObjectIds) {
		return len(updatedIds), nil
	}

	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "SCHEDULER#" + schedulerId,
	})
	if err != nil {
		logger.Log.Error("failed to marshal key: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to marshal key: %w", err)
	}

	update := expression.Set(expression.Name("object_ids"), expression.Value(updatedIds)).
		Set(expression.Name("updated_at"), expression.Value(time.Now().UTC().Format(time.RFC3339)))
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		logger.Log.Error("failed to build expression: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to build expression: %w", err)
	}

	_, err = r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                 aws.String(r.table),
		Key:                       key,
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
	})
	if err != nil {
		logger.Log.Error("failed to update item: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to update item: %w", err)
	}

	logger.Log.Info("object id removed from scheduler: ", logger.String("scheduler_id", schedulerId), logger.String("object_id", objectId))
	return len(updatedIds), nil
}

// Disable liga enabled=false sem mexer em mais nada do agendador -- usado quando o
// último objeto vinculado a ele é excluído. O alarme já agendado no aparelho não sabe
// disso na hora (só é apagado no próximo sync do app), então RetrieveAndGenerate tolera
// um agendador sem objetos e devolve sem desafios em vez de erro, pra esse disparo
// pendente não quebrar. Se o agendador já não existe, não é erro: nada a desabilitar.
func (r *SchedulerRepository) Disable(ctx context.Context, userId string, schedulerId string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "SCHEDULER#" + schedulerId,
	})
	if err != nil {
		logger.Log.Error("failed to marshal key: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	update := expression.Set(expression.Name("enabled"), expression.Value(false)).
		Set(expression.Name("updated_at"), expression.Value(time.Now().UTC().Format(time.RFC3339)))
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		logger.Log.Error("failed to build expression: ", logger.Any("error", err))
		return fmt.Errorf("failed to build expression: %w", err)
	}

	_, err = r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                 aws.String(r.table),
		Key:                       key,
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		ConditionExpression:       aws.String("attribute_exists(PK)"),
	})
	if err != nil {
		var conditionFailed *types.ConditionalCheckFailedException
		if errors.As(err, &conditionFailed) {
			return nil
		}
		logger.Log.Error("failed to update item: ", logger.Any("error", err))
		return fmt.Errorf("failed to update item: %w", err)
	}

	logger.Log.Info("scheduler disabled, no objects left: ", logger.String("scheduler_id", schedulerId))
	return nil
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
