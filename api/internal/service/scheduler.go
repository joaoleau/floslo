package service

import (
	"context"
	"fmt"
	"time"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
	"github.com/joaoleau/floslo/internal/utils"
)

type SchedulerService struct {
	SchedulerRepository  *repository.SchedulerRepository
	StorageService       *StorageService
}

func NewSchedulerService(schedulerRepo *repository.SchedulerRepository, storageService *StorageService) *SchedulerService {
	return &SchedulerService{
		SchedulerRepository:  schedulerRepo,
		StorageService:       storageService,
	}
}

func (s *SchedulerService) CreateScheduler(ctx context.Context, username string, scheduler *model.Scheduler) error {
	if scheduler.Name == "" {
		return fmt.Errorf("scheduler name is required")
	}
	if len(scheduler.WeekDays) == 0 {
		return fmt.Errorf("at least one weekday is required")
	}
	for _, day := range scheduler.WeekDays {
		if !day.Validate() {
			return fmt.Errorf("invalid weekday: %s", day)
		}
	}
	if scheduler.StartTime == "" {
		return fmt.Errorf("start time is required")
	}
	if scheduler.SnoozeDuration < 0 {
		return fmt.Errorf("snooze duration must be non-negative")
	}
	if scheduler.AlarmSound == "" {
		return fmt.Errorf("alarm sound is required")
	}
	if len(scheduler.DocumentNames) == 0 {
		return fmt.Errorf("at least one document key is required")

	}

	id, err := utils.GenerateID("sch")
	if err != nil {
		return fmt.Errorf("failed to generate scheduler ID: %w", err)
	}
	scheduler.Id = id
	scheduler.SetKeys(username)
	scheduler.CreatedAt = time.Now().UTC()
	scheduler.UpdatedAt = time.Now().UTC()
	err = s.SchedulerRepository.NewScheduler(ctx, scheduler)
	if err != nil {
		logger.Log.Error("failed to create scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to create scheduler: %w", err)
	}

	for _, documentName := range scheduler.DocumentNames {
		err = s.StorageService.AddSchedulerOnObjectMetadata(ctx, username, documentName, scheduler.Id)
		if err != nil {
			logger.Log.Error("failed to add scheduler on metatada: ", logger.Any("error", err))
			return fmt.Errorf("failed to add scheduler on metatada: %w", err)
		}
	}

	logger.Log.Info("scheduler created: ", logger.String("scheduler_id", scheduler.Id))
	return nil
}

func (s *SchedulerService) GetSchedulerById(ctx context.Context, username string, schedulerId string) (*model.Scheduler, error) {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, username, schedulerId)
	if err != nil {
		logger.Log.Error("failed to get scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get scheduler: %w", err)
	}
	logger.Log.Info("scheduler found: ", logger.String("scheduler_id", scheduler.Id))
	return scheduler, nil
}

func (s *SchedulerService) ListSchedulers(ctx context.Context, username string) ([]*model.Scheduler, error) {
	schedulers, err := s.SchedulerRepository.ListSchedulers(ctx, username)
	if err != nil {
		logger.Log.Error("failed to list schedulers: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to list schedulers: %w", err)
	}
	logger.Log.Info("schedulers listed: ", logger.Any("count", len(schedulers)))
	return schedulers, nil
}

func (s *SchedulerService) UpdateScheduler(ctx context.Context, username string, update *model.UpdateScheduler) (*model.Scheduler, error) {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, username, update.Id)
	if err != nil {
		logger.Log.Error("failed to get scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get scheduler: %w", err)
	}
	if update.Name != nil {
		scheduler.Name = *update.Name
	}
	if update.WeekDays != nil {
		scheduler.WeekDays = *update.WeekDays
	}
	if update.StartTime != nil {
		scheduler.StartTime = *update.StartTime
	}
	if update.SnoozeDuration != nil {
		scheduler.SnoozeDuration = *update.SnoozeDuration
	}
	if update.AlarmSound != nil {
		scheduler.AlarmSound = *update.AlarmSound
	}
	if update.DocumentNames != nil {
		scheduler.DocumentNames = *update.DocumentNames
		for _, documentName := range scheduler.DocumentNames {
			err = s.StorageService.AddSchedulerOnObjectMetadata(ctx, username, documentName, scheduler.Id)
			if err != nil {
				logger.Log.Error("failed to add scheduler on metatada: ", logger.Any("error", err))
				return nil, fmt.Errorf("failed to add scheduler on metatada: %w", err)
			}
		}
	}
	if update.Enabled != nil {
		scheduler.Enabled = *update.Enabled
	}
	scheduler.UpdatedAt = time.Now().UTC()
	updatedScheduler, err := s.SchedulerRepository.UpdateScheduler(ctx, scheduler)
	if err != nil {
		logger.Log.Error("failed to update scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update scheduler: %w", err)
	}

	logger.Log.Info("scheduler updated: ", logger.String("scheduler_id", updatedScheduler.Id))
	return updatedScheduler, nil
}

func (s *SchedulerService) DeleteScheduler(ctx context.Context, username string, schedulerId string) error {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, username, schedulerId)
	if err != nil {
		logger.Log.Error("failed to get scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to get scheduler: %w", err)
	}

	err = s.SchedulerRepository.DeleteScheduler(ctx, username, schedulerId)
	if err != nil {
		logger.Log.Error("failed to delete scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete scheduler: %w", err)
	}
	logger.Log.Info("scheduler deleted: ", logger.String("scheduler_id", schedulerId))

	for _, documentName := range scheduler.DocumentNames {
		err = s.StorageService.DeleteSchedulerOnObjectMetadata(ctx, username, documentName, scheduler.Id)
		if err != nil {
			logger.Log.Error("failed to delete scheduler on metatada: ", logger.Any("error", err))
			return fmt.Errorf("failed to delete scheduler on metatada: %w", err)
		}
	}
	return nil
}
