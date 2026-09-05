package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
)

const dateLayout = "2006-01-02"

type UserStatsRepository struct {
	db    *dynamodb.Client
	table string
}

func NewUserStatsRepository(db *dynamodb.Client, table string) *UserStatsRepository {
	return &UserStatsRepository{
		db:    db,
		table: table,
	}
}

// GetByUserId never errors on "not found" -- a user who hasn't answered anything
// yet simply has no STATS item, and the zero-value (streak 0, empty counts) is
// exactly what the summary card should show for them.
func (r *UserStatsRepository) GetByUserId(ctx context.Context, userId string) (*model.UserStats, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"PK": "USER#" + userId,
		"SK": "STATS",
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
		stats := &model.UserStats{UserId: userId, AnsweredByType: map[string]int{}}
		stats.SetKeys(userId)
		return stats, nil
	}

	var stats model.UserStats
	if err := attributevalue.UnmarshalMap(result.Item, &stats); err != nil {
		logger.Log.Error("failed to unmarshal user stats: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to unmarshal user stats: %w", err)
	}
	if stats.AnsweredByType == nil {
		stats.AnsweredByType = map[string]int{}
	}
	return &stats, nil
}

// RecordAnswer bumps the streak (based on localDate vs. the last recorded date)
// and the per-type counter, then overwrites the whole item -- same
// read-then-write shape as SchedulerRepository.UpdateScheduler, no transaction
// needed for a single-writer-per-user counter like this.
func (r *UserStatsRepository) RecordAnswer(ctx context.Context, userId string, challengeType string, localDate string) error {
	stats, err := r.GetByUserId(ctx, userId)
	if err != nil {
		return err
	}

	stats.CurrentStreak = nextStreak(stats.CurrentStreak, stats.LastActiveDate, localDate)
	stats.LastActiveDate = localDate
	stats.AnsweredByType[challengeType]++

	item, err := attributevalue.MarshalMap(stats)
	if err != nil {
		logger.Log.Error("failed to marshal user stats: ", logger.Any("error", err))
		return fmt.Errorf("failed to marshal user stats: %w", err)
	}
	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      item,
	})
	if err != nil {
		logger.Log.Error("failed to put item: ", logger.Any("error", err))
		return fmt.Errorf("failed to put item: %w", err)
	}

	logger.Log.Info("user stats updated: ", logger.String("user_id", userId))
	return nil
}

func nextStreak(currentStreak int, lastActiveDate string, localDate string) int {
	if lastActiveDate == localDate {
		return currentStreak
	}

	last, err := time.Parse(dateLayout, lastActiveDate)
	if err != nil {
		return 1
	}
	next, err := time.Parse(dateLayout, localDate)
	if err != nil {
		return 1
	}
	if next.Sub(last) == 24*time.Hour {
		return currentStreak + 1
	}
	return 1
}
