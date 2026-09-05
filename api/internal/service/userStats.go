package service

import (
	"context"
	"fmt"
	"time"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
)

type UserStatsService struct {
	userStatsRepository *repository.UserStatsRepository
}

func NewUserStatsService(userStatsRepository *repository.UserStatsRepository) *UserStatsService {
	return &UserStatsService{
		userStatsRepository: userStatsRepository,
	}
}

func (s *UserStatsService) GetStats(ctx context.Context, userId string) (*model.UserStats, error) {
	stats, err := s.userStatsRepository.GetByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to get user stats: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}
	return stats, nil
}

func (s *UserStatsService) RecordAnswer(ctx context.Context, userId string, challengeType string, localDate string) error {
	if !model.ChallengeType(challengeType).Validate() {
		return fmt.Errorf("invalid challenge type: %s", challengeType)
	}
	if _, err := time.Parse("2006-01-02", localDate); err != nil {
		return fmt.Errorf("invalid local_date, expected YYYY-MM-DD: %w", err)
	}

	if err := s.userStatsRepository.RecordAnswer(ctx, userId, challengeType, localDate); err != nil {
		logger.Log.Error("failed to record answer: ", logger.Any("error", err))
		return fmt.Errorf("failed to record answer: %w", err)
	}
	return nil
}
