package service

import (
	"context"
	"fmt"
	"time"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"

	"github.com/joaoleau/floslo/internal/config/logger"
)

type UserService struct {
	userRepository *repository.UserRepository
}

func NewUserService(userRepository *repository.UserRepository) *UserService {
	return &UserService{
		userRepository: userRepository,
	}
}

func (s *UserService) GetUserByUserId(ctx context.Context, userId string) (*model.User, error){	
	user, err := s.userRepository.GetUserByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to get user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	logger.Log.Info("user found: ", logger.String("user_id", user.Id))
	return user, nil
}

func (s *UserService) UpdateUserByUserId(ctx context.Context, userId string, update *model.UpdateUser) (*model.User, error) {
	user, err := s.userRepository.GetUserByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to get user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if update.Email != nil {
		user.Email = *update.Email
	}
	if update.Password != nil {
		user.Password = *update.Password
	}
	user.UpdatedAt = time.Now().UTC()
	updatedUser, err := s.userRepository.UpdateUserByUserId(ctx, userId, user)
	if err != nil {
		logger.Log.Error("failed to update user: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	logger.Log.Info("user updated: ", logger.String("user_id", updatedUser.Id))
	return updatedUser, nil
}

func (s *UserService) DeleteUserByUserId(ctx context.Context, userId string) error {
	err := s.userRepository.DeleteUserByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to delete user: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete user: %w", err)
	}
	logger.Log.Info("user deleted: ", logger.String("user_id", userId))
	return nil
}