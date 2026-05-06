package service

import (
	"context"
	"fmt"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"

	"github.com/joaoleau/floslo/internal/config/logger"
	"go.uber.org/zap"
)

type UserService struct {
	userRepository *repository.UserRepository
}

func NewUserService(userRepository *repository.UserRepository) *UserService {
	return &UserService{
		userRepository: userRepository,
	}
}

func (s *UserService) GetUserByUsername(ctx context.Context, username string) (*model.User, error){	
	user, err := s.userRepository.GetUserByUsername(ctx, username)
	if err != nil {
		logger.Error("failed to get user: ", err)
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	logger.Info("user found: ", zap.String("username", user.Username))
	return user, nil
}

func (s *UserService) UpdateUserByUsername(ctx context.Context, username string, user *model.User) (*model.User, error) {
	updatedUser, err := s.userRepository.UpdateUserByUsername(ctx, username, user)
	if err != nil {
		logger.Error("failed to update user: ", err)
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	logger.Info("user updated: ", zap.String("username", updatedUser.Username))
	return updatedUser, nil
}

func (s *UserService) DeleteUserByUsername(ctx context.Context, username string) error {
	err := s.userRepository.DeleteUserByUsername(ctx, username)
	if err != nil {
		logger.Error("failed to delete user: ", err)
		return fmt.Errorf("failed to delete user: %w", err)
	}
	logger.Info("user deleted: ", zap.String("username", username))
	return nil
}