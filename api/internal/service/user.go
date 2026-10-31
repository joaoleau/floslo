package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"

	"github.com/joaoleau/floslo/internal/config/logger"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	userRepository   *repository.UserRepository
	objectService    *ObjectService
	schedulerService *SchedulerService
	storageService   *StorageService
}

func NewUserService(
	userRepository *repository.UserRepository,
	objectService *ObjectService,
	schedulerService *SchedulerService,
	storageService *StorageService,
) *UserService {
	return &UserService{
		userRepository:   userRepository,
		objectService:    objectService,
		schedulerService: schedulerService,
		storageService:   storageService,
	}
}

func (s *UserService) GetUserByUserId(ctx context.Context, userId string) (*model.User, error) {
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
	if update.Username != nil {
		newUsername := strings.TrimSpace(*update.Username)
		if newUsername == "" {
			return nil, fmt.Errorf("username cannot be empty")
		}
		if !strings.EqualFold(newUsername, user.Username) {
			if existing, _ := s.userRepository.GetUserByUsername(ctx, newUsername); existing != nil {
				return nil, fmt.Errorf("username already exists")
			}
		}
		user.Username = newUsername
	}

	if update.Password != nil {
		if update.CurrentPassword == nil {
			return nil, fmt.Errorf("current password is required to set a new password")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(*update.CurrentPassword)); err != nil {
			return nil, fmt.Errorf("current password is incorrect")
		}
		if err := ValidatePasswordStrength(*update.Password); err != nil {
			return nil, err
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*update.Password), bcrypt.DefaultCost)
		if err != nil {
			logger.Log.Error("failed to hash password: ", logger.Any("error", err))
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
		user.Password = string(hash)
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
	user, err := s.userRepository.GetUserByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to get user for account deletion: ", logger.Any("error", err))
		return fmt.Errorf("failed to get user for account deletion: %w", err)
	}

	objects, err := s.objectService.ListObjects(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to list objects for account deletion: ", logger.Any("error", err))
		return fmt.Errorf("failed to list objects for account deletion: %w", err)
	}
	for _, object := range objects {
		if err := s.objectService.DeleteObject(ctx, userId, object.Id); err != nil {
			logger.Log.Error("failed to delete object during account deletion: ", logger.Any("error", err))
			return fmt.Errorf("failed to delete object %s during account deletion: %w", object.Id, err)
		}
	}

	schedulers, err := s.schedulerService.ListSchedulers(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to list schedulers for account deletion: ", logger.Any("error", err))
		return fmt.Errorf("failed to list schedulers for account deletion: %w", err)
	}
	for _, scheduler := range schedulers {
		if err := s.schedulerService.DeleteScheduler(ctx, userId, scheduler.Id); err != nil {
			logger.Log.Error("failed to delete scheduler during account deletion: ", logger.Any("error", err))
			return fmt.Errorf("failed to delete scheduler %s during account deletion: %w", scheduler.Id, err)
		}
	}

	orphanedObjectNames, err := s.storageService.ListObjects(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to list remaining storage objects for account deletion: ", logger.Any("error", err))
		return fmt.Errorf("failed to list remaining storage objects for account deletion: %w", err)
	}
	for _, objectName := range orphanedObjectNames {
		if err := s.storageService.DeleteObject(ctx, userId, objectName); err != nil {
			logger.Log.Error("failed to delete orphaned storage object during account deletion: ", logger.Any("error", err))
			return fmt.Errorf("failed to delete orphaned storage object %s during account deletion: %w", objectName, err)
		}
	}

	if err := s.userRepository.DeleteEmailLookup(ctx, user.Email); err != nil {
		logger.Log.Error("failed to delete email lookup for account deletion: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete email lookup for account deletion: %w", err)
	}

	if err := s.userRepository.DeleteUserByUserId(ctx, userId); err != nil {
		logger.Log.Error("failed to delete user: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete user: %w", err)
	}
	logger.Log.Info("user account fully deleted: ", logger.String("user_id", userId))
	return nil
}
