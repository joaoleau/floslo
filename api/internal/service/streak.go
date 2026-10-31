package service

import (
	"context"
	"fmt"
	"time"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/repository"
)

type StreakService struct {
	userRepository *repository.UserRepository
}

func NewStreakService(userRepository *repository.UserRepository) *StreakService {
	return &StreakService{userRepository: userRepository}
}

func nextStreak(currentStreak int, lastActiveDate string, localDate string) int {
	if lastActiveDate != "" && localDate <= lastActiveDate {
		return currentStreak
	}
	if lastActiveDate != "" {
		if yesterday, err := time.Parse("2006-01-02", localDate); err == nil {
			if yesterday.AddDate(0, 0, -1).Format("2006-01-02") == lastActiveDate {
				return currentStreak + 1
			}
		}
	}
	return 1
}

func (s *StreakService) Record(ctx context.Context, userId string, localDate string) (int, error) {
	if _, err := time.Parse("2006-01-02", localDate); err != nil {
		return 0, fmt.Errorf("invalid local_date, expected YYYY-MM-DD: %w", err)
	}

	user, err := s.userRepository.GetUserByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to get user: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to get user: %w", err)
	}

	updatedStreak := nextStreak(user.CurrentStreak, user.LastActiveDate, localDate)
	newLastActiveDate := user.LastActiveDate
	if localDate > newLastActiveDate {
		newLastActiveDate = localDate
	}

	if updatedStreak == user.CurrentStreak && newLastActiveDate == user.LastActiveDate {
		return user.CurrentStreak, nil
	}

	updatedUser, err := s.userRepository.UpdateStreak(ctx, userId, updatedStreak, newLastActiveDate)
	if err != nil {
		logger.Log.Error("failed to update streak: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to update streak: %w", err)
	}
	return updatedUser.CurrentStreak, nil
}
