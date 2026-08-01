package service

import (
	"context"
	"fmt"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
)

type ObjectService struct {
	ObjectRepository              *repository.ObjectRepository
	SchedulerObjectLinkRepository *repository.SchedulerObjectLinkRepository
	StorageService                *StorageService
	VectorService                 *VectorService
}

func NewObjectService(
	objectRepo *repository.ObjectRepository,
	schedulerObjectLinkRepo *repository.SchedulerObjectLinkRepository,
	storageService *StorageService,
	vectorService *VectorService,
) *ObjectService {
	return &ObjectService{
		ObjectRepository:              objectRepo,
		SchedulerObjectLinkRepository: schedulerObjectLinkRepo,
		StorageService:                storageService,
		VectorService:                 vectorService,
	}
}

func (s *ObjectService) ListObjects(ctx context.Context, userId string) ([]*model.Object, error) {
	objects, err := s.ObjectRepository.ListObjectsByUser(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to list objects: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to list objects: %w", err)
	}
	logger.Log.Info("objects listed: ", logger.Any("count", len(objects)))
	return objects, nil
}

func (s *ObjectService) GetObjectById(ctx context.Context, userId string, objectId string) (*model.Object, error) {
	object, err := s.ObjectRepository.GetObjectById(ctx, userId, objectId)
	if err != nil {
		logger.Log.Error("failed to get object: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to get object: %w", err)
	}
	logger.Log.Info("object found: ", logger.String("object_id", object.Id))
	return object, nil
}

func (s *ObjectService) UpdateObjectTags(ctx context.Context, userId string, objectId string, tags []string) (*model.Object, error) {
	updatedObject, err := s.ObjectRepository.UpdateObjectTags(ctx, userId, objectId, tags)
	if err != nil {
		logger.Log.Error("failed to update object tags: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update object tags: %w", err)
	}
	logger.Log.Info("object tags updated: ", logger.String("object_id", objectId))
	return updatedObject, nil
}

// DeleteObject removes an object from every system that stores data about it: its S3
// Vector embeddings, its S3 file, the scheduler links that reference it, and finally its
// DynamoDB record. The DynamoDB record is deleted last on purpose: it's what
// ListObjects/GetObjectById rely on, so if an earlier step fails the object still shows
// up and the caller can safely retry the delete instead of ending up with an
// orphaned/ghost record.
func (s *ObjectService) DeleteObject(ctx context.Context, userId string, objectId string) error {
	object, err := s.ObjectRepository.GetObjectById(ctx, userId, objectId)
	if err != nil {
		logger.Log.Error("failed to find object to delete: ", logger.Any("error", err))
		return fmt.Errorf("failed to find object to delete: %w", err)
	}

	if err := s.VectorService.DeleteVectors(ctx, object.VectorIds); err != nil {
		logger.Log.Error("failed to delete object vectors: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete object vectors: %w", err)
	}

	if err := s.StorageService.DeleteObject(ctx, userId, object.Name); err != nil {
		logger.Log.Error("failed to delete object from storage: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete object from storage: %w", err)
	}

	links, err := s.SchedulerObjectLinkRepository.ListByObjectID(ctx, userId, objectId)
	if err != nil {
		logger.Log.Error("failed to list scheduler links for object: ", logger.Any("error", err))
		return fmt.Errorf("failed to list scheduler links for object: %w", err)
	}
	for _, link := range links {
		if err := s.SchedulerObjectLinkRepository.DeleteLink(ctx, userId, objectId, link.SchedulerId); err != nil {
			logger.Log.Error("failed to delete scheduler link for object: ", logger.Any("error", err))
			return fmt.Errorf("failed to delete scheduler link for object: %w", err)
		}
	}

	if err := s.ObjectRepository.DeleteObjectById(ctx, userId, objectId); err != nil {
		logger.Log.Error("failed to delete object metadata: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete object metadata: %w", err)
	}

	logger.Log.Info("object deleted: ", logger.String("object_id", objectId))
	return nil
}
