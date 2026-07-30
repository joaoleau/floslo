package service

import (
	"context"
	"fmt"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
)

type ObjectService struct {
	ObjectRepository *repository.ObjectRepository
}

func NewObjectService(objectRepo *repository.ObjectRepository) *ObjectService {
	return &ObjectService{
		ObjectRepository: objectRepo,
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
