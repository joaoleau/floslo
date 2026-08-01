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
	userRepository   *repository.UserRepository
	objectService    *ObjectService
	schedulerService *SchedulerService
	storageService   *StorageService
}

func NewUserService(userRepository *repository.UserRepository, objectService *ObjectService, schedulerService *SchedulerService, storageService *StorageService) *UserService {
	return &UserService{
		userRepository:   userRepository,
		objectService:    objectService,
		schedulerService: schedulerService,
		storageService:   storageService,
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

// DeleteUserByUserId deletes the account and everything tied to it: every object (which
// already cascades to its S3 file, its S3 Vectors embeddings, and its scheduler links),
// every scheduler (which already cascades to its remaining scheduler links), any S3 file
// left over without a DynamoDB object record, and finally the user profile itself. The
// profile record is deleted last so a failed cascade leaves the account retryable instead
// of gone while orphaned data remains.
func (s *UserService) DeleteUserByUserId(ctx context.Context, userId string) error {
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

	// Catches S3 files that never got a DynamoDB object record (e.g. an upload whose
	// extension the processor doesn't handle, or ingestion that failed before the
	// record was written), so no tenant data survives account deletion.
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

	if err := s.userRepository.DeleteUserByUserId(ctx, userId); err != nil {
		logger.Log.Error("failed to delete user: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete user: %w", err)
	}
	logger.Log.Info("user account fully deleted: ", logger.String("user_id", userId))
	return nil
}