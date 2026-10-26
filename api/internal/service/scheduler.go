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
	SchedulerRepository           *repository.SchedulerRepository
	SchedulerObjectLinkRepository *repository.SchedulerObjectLinkRepository
	StorageService                *StorageService
}

func NewSchedulerService(schedulerRepo *repository.SchedulerRepository, schedulerObjectLinkRepo *repository.SchedulerObjectLinkRepository, storageService *StorageService) *SchedulerService {
	return &SchedulerService{
		SchedulerRepository:           schedulerRepo,
		SchedulerObjectLinkRepository: schedulerObjectLinkRepo,
		StorageService:                storageService,
	}
}

// MaxItemsPerScheduler is the total number of items (questions, cards, discoveries) a
// scheduler can ask for in one firing, summed across all its challengers. Keep in sync with
// the limit in mobile's SchedulerForm.
const MaxItemsPerScheduler = 10

func validateChallenger(c model.Challenger) error {
	if !c.ChallengeType.Validate() {
		return fmt.Errorf("invalid challenge type: %s", c.ChallengeType)
	}

	switch c.ChallengeType {
	case model.ChallengeTypeMultipleChoice:
		if c.MultipleChoice == nil {
			return fmt.Errorf("multiple choice config is required for MULTIPLE_CHOICE challenge")
		}
	case model.ChallengeTypeTrueFalse:
		if c.TrueFalse == nil {
			return fmt.Errorf("true/false config is required for TRUE_FALSE challenge")
		}
	case model.ChallengeTypeDiscovery:
		if c.Discovery == nil {
			return fmt.Errorf("discovery config is required for DISCOVERY challenge")
		}
	}

	if count := c.ItemCount(); count < 1 || count > MaxItemsPerScheduler {
		return fmt.Errorf("item count must be between 1 and %d", MaxItemsPerScheduler)
	}

	return nil
}

// validateChallengers checks every challenger and the total number of items across all of
// them. The backend enforces the total because it accepts any number of challengers.
func validateChallengers(challengers []model.Challenger) error {
	total := 0
	for _, challenger := range challengers {
		if err := validateChallenger(challenger); err != nil {
			return err
		}
		total += challenger.ItemCount()
	}

	if total > MaxItemsPerScheduler {
		return fmt.Errorf("total item count must be at most %d, got %d", MaxItemsPerScheduler, total)
	}

	return nil
}

func validateLanguage(language model.Language) error {
	if !language.Validate() {
		return fmt.Errorf("invalid language: %s", language)
	}
	return nil
}

func (s *SchedulerService) CreateScheduler(ctx context.Context, userId string, scheduler *model.Scheduler) error {
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
	if scheduler.AlarmSound == "" {
		return fmt.Errorf("alarm sound is required")
	}
	if len(scheduler.ObjectIds) == 0 {
		return fmt.Errorf("at least one document key is required")

	}
	if err := validateLanguage(scheduler.Language); err != nil {
		return err
	}
	if err := validateChallengers(scheduler.Challengers); err != nil {
		return err
	}

	scheduler.Id = utils.GenerateID("sch")
	scheduler.SetKeys(userId)
	scheduler.CreatedAt = time.Now().UTC()
	scheduler.UpdatedAt = time.Now().UTC()
	err := s.SchedulerRepository.NewScheduler(ctx, scheduler)
	if err != nil {
		logger.Log.Error("failed to create scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to create scheduler: %w", err)
	}

	for _, objectId := range scheduler.ObjectIds {
		schedulerObjectLink := &model.SchedulerObjectLink{
			UserId:      userId,
			SchedulerId: scheduler.Id,
			ObjectId:    objectId,
		}
		schedulerObjectLink.SetKeys()
		err = s.SchedulerObjectLinkRepository.CreateLink(ctx, schedulerObjectLink)
		if err != nil {
			logger.Log.Error("failed to add scheduler on metadata: ", logger.Any("error", err))
			return fmt.Errorf("failed to add scheduler on metadata: %w", err)
		}
	}

	logger.Log.Info("scheduler created: ", logger.String("scheduler_id", scheduler.Id))
	return nil
}

func (s *SchedulerService) GetSchedulerById(ctx context.Context, userId string, schedulerId string) (*model.Scheduler, error) {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, userId, schedulerId)
	if err != nil {
		logger.Log.Error("failed to get scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get scheduler: %w", err)
	}
	logger.Log.Info("scheduler found: ", logger.String("scheduler_id", scheduler.Id))
	return scheduler, nil
}

func (s *SchedulerService) ListSchedulers(ctx context.Context, userId string) ([]*model.Scheduler, error) {
	schedulers, err := s.SchedulerRepository.ListSchedulers(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to list schedulers: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to list schedulers: %w", err)
	}
	logger.Log.Info("schedulers listed: ", logger.Any("count", len(schedulers)))
	return schedulers, nil
}

func (s *SchedulerService) UpdateScheduler(ctx context.Context, userId string, update *model.UpdateScheduler) (*model.Scheduler, error) {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, userId, update.Id)
	if err != nil {
		logger.Log.Error("failed to get scheduler: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get scheduler: %w", err)
	}
	if update.Name != nil {
		scheduler.Name = *update.Name
	}
	if update.Language != nil {
		scheduler.Language = *update.Language
	}
	if update.WeekDays != nil {
		scheduler.WeekDays = *update.WeekDays
	}
	if update.StartTime != nil {
		scheduler.StartTime = *update.StartTime
	}
	if update.AlarmSound != nil {
		scheduler.AlarmSound = *update.AlarmSound
	}
	if update.Vibration != nil {
		scheduler.Vibration = *update.Vibration
	}
	if update.SoundEnabled != nil {
		scheduler.SoundEnabled = update.SoundEnabled
	}
	if update.ObjectIds != nil {
		scheduler.ObjectIds = *update.ObjectIds
		toAdd, toRemove := s.diffObjects(scheduler.ObjectIds, *update.ObjectIds)
		for _, objectId := range toAdd {
			schedulerObjectLink := &model.SchedulerObjectLink{
				UserId:      userId,
				SchedulerId: scheduler.Id,
				ObjectId:    objectId,
			}
			schedulerObjectLink.SetKeys()
			err = s.SchedulerObjectLinkRepository.CreateLink(ctx, schedulerObjectLink)

			if err != nil {
				return nil, err
			}
		}
		for _, objectId := range toRemove {
			err = s.SchedulerObjectLinkRepository.DeleteLink(ctx, userId, objectId, scheduler.Id)
			if err != nil {
				logger.Log.Error("failed to remove scheduler from metadata: ", logger.Any("error", err))
				return nil, fmt.Errorf("failed to remove scheduler from metadata: %w", err)
			}
		}
	}
	if update.Challengers != nil {
		scheduler.Challengers = *update.Challengers
	}
	if err := validateLanguage(scheduler.Language); err != nil {
		return nil, err
	}
	if err := validateChallengers(scheduler.Challengers); err != nil {
		return nil, err
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

func (s *SchedulerService) diffObjects(oldObjs, newObjs []string) ([]string, []string) {
	oldMap := make(map[string]bool)
	newMap := make(map[string]bool)

	for _, v := range oldObjs {
		oldMap[v] = true
	}

	for _, v := range newObjs {
		newMap[v] = true
	}

	var toAdd []string
	var toRemove []string

	for _, v := range newObjs {
		if !oldMap[v] {
			toAdd = append(toAdd, v)
		}
	}

	for _, v := range oldObjs {
		if !newMap[v] {
			toRemove = append(toRemove, v)
		}
	}

	return toAdd, toRemove
}

func (s *SchedulerService) DeleteScheduler(ctx context.Context, userId string, schedulerId string) error {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, userId, schedulerId)
	if err != nil {
		logger.Log.Error("failed to get scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to get scheduler: %w", err)
	}

	err = s.SchedulerRepository.DeleteScheduler(ctx, userId, schedulerId)
	if err != nil {
		logger.Log.Error("failed to delete scheduler: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete scheduler: %w", err)
	}
	logger.Log.Info("scheduler deleted: ", logger.String("scheduler_id", schedulerId))

	for _, objectId := range scheduler.ObjectIds {
		err = s.SchedulerObjectLinkRepository.DeleteLink(ctx, userId, objectId, schedulerId)
		if err != nil {
			logger.Log.Error("failed to delete scheduler on metadata: ", logger.Any("error", err))
			return fmt.Errorf("failed to delete scheduler on metadata: %w", err)
		}
	}
	return nil
}
