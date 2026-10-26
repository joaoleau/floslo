package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
)

const (
	DefaultMaxTagLength     = 32
	DefaultMaxTagsPerObject = 300
)

const MaxObjectNameLength = 150

// TagLimits são os cortes de tags numa edição: MaxLength conta caracteres (não bytes) e
// MaxPerObject é a quantidade de tags de um objeto. Vêm das variáveis TAG_MAX_LENGTH e
// MAX_TAGS_PER_OBJECT (internal/config).
type TagLimits struct {
	MaxLength    int
	MaxPerObject int
}

var DefaultTagLimits = TagLimits{MaxLength: DefaultMaxTagLength, MaxPerObject: DefaultMaxTagsPerObject}

// withDefaults troca um limite zerado (não configurado) pelo padrão.
func (l TagLimits) withDefaults() TagLimits {
	if l.MaxLength <= 0 {
		l.MaxLength = DefaultMaxTagLength
	}
	if l.MaxPerObject <= 0 {
		l.MaxPerObject = DefaultMaxTagsPerObject
	}
	return l
}

type ObjectService struct {
	ObjectRepository              *repository.ObjectRepository
	SchedulerRepository           *repository.SchedulerRepository
	SchedulerObjectLinkRepository *repository.SchedulerObjectLinkRepository
	StorageService                *StorageService
	VectorService                 *VectorService
	TagLimits                     TagLimits
}

func NewObjectService(
	objectRepo *repository.ObjectRepository,
	schedulerRepo *repository.SchedulerRepository,
	schedulerObjectLinkRepo *repository.SchedulerObjectLinkRepository,
	storageService *StorageService,
	vectorService *VectorService,
	tagLimits TagLimits,
) *ObjectService {
	return &ObjectService{
		ObjectRepository:              objectRepo,
		SchedulerRepository:           schedulerRepo,
		SchedulerObjectLinkRepository: schedulerObjectLinkRepo,
		StorageService:                storageService,
		VectorService:                 vectorService,
		TagLimits:                     tagLimits.withDefaults(),
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

// sanitizeTags nunca rejeita a lista inteira por causa de uma tag comprida -- ela só
// corta pro limite. Tags vindas do processor (keywords do YAKE, até 4 palavras) podem
// passar de limits.MaxLength; se isso virasse erro aqui, qualquer edição futura desse objeto
// (mesmo sem mexer nas tags) ficaria bloqueada por uma tag que o usuário nem escreveu.
func sanitizeTags(tags []string, limits TagLimits) []string {
	cleanTags := make([]string, 0, len(tags))
	seen := make(map[string]bool, len(tags))
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		// O limite conta caracteres (runes), não bytes: cortar em bytes partiria um
		// caractere acentuado ao meio.
		if runes := []rune(trimmed); len(runes) > limits.MaxLength {
			trimmed = strings.TrimSpace(string(runes[:limits.MaxLength]))
		}
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		cleanTags = append(cleanTags, trimmed)
	}
	if len(cleanTags) > limits.MaxPerObject {
		cleanTags = cleanTags[:limits.MaxPerObject]
	}
	return cleanTags
}

func (s *ObjectService) UpdateObjectTags(ctx context.Context, userId string, objectId string, tags []string) (*model.Object, error) {
	cleanTags := sanitizeTags(tags, s.TagLimits)

	updatedObject, err := s.ObjectRepository.UpdateObjectTags(ctx, userId, objectId, cleanTags)
	if err != nil {
		logger.Log.Error("failed to update object tags: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update object tags: %w", err)
	}
	logger.Log.Info("object tags updated: ", logger.String("object_id", objectId))
	return updatedObject, nil
}

// objectExtension extrai a extensão (com o ponto, ex.: ".pdf") de um nome de arquivo --
// mesma regra usada pelo mapper do mobile (mappers/objectMapper.ts), pra manter os dois
// lados consistentes: um ponto líder (ex.: ".gitignore") não conta como extensão.
func objectExtension(filename string) string {
	dot := strings.LastIndex(filename, ".")
	if dot <= 0 {
		return ""
	}
	return filename[dot:]
}

func objectBaseName(filename string) string {
	dot := strings.LastIndex(filename, ".")
	if dot <= 0 {
		return filename
	}
	return filename[:dot]
}

// UpdateObjectName renomeia só a parte "base" do nome -- a extensão sempre vem do nome
// já salvo (imutável desde o upload), nunca do que o usuário digitou. Mesmo que o campo
// enviado inclua um ponto/sufixo, ele é descartado: o usuário não deve conseguir trocar
// a extensão de um objeto por esse caminho.
func (s *ObjectService) UpdateObjectName(ctx context.Context, userId string, objectId string, name string) (*model.Object, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return nil, fmt.Errorf("name cannot be empty")
	}

	existing, err := s.ObjectRepository.GetObjectById(ctx, userId, objectId)
	if err != nil {
		logger.Log.Error("failed to load object for rename: ", logger.Any("error", err))
		return nil, fmt.Errorf("object not found")
	}

	newBase := objectBaseName(trimmed)
	if newBase == "" {
		return nil, fmt.Errorf("name cannot be empty")
	}

	newName := newBase + objectExtension(existing.Name)
	if len(newName) > MaxObjectNameLength {
		return nil, fmt.Errorf("name exceeds max length of %d characters", MaxObjectNameLength)
	}

	updatedObject, err := s.ObjectRepository.UpdateObjectName(ctx, userId, objectId, newName)
	if err != nil {
		logger.Log.Error("failed to update object name: ", logger.Any("error", err))
		return nil, fmt.Errorf("failed to update object name: %w", err)
	}
	logger.Log.Info("object name updated: ", logger.String("object_id", objectId))
	return updatedObject, nil
}

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

	storageKeyPrefix := fmt.Sprintf("tenants/%s/context/", userId)
	if err := s.StorageService.DeleteObject(ctx, userId, strings.TrimPrefix(object.Key, storageKeyPrefix)); err != nil {
		logger.Log.Error("failed to delete object from storage: ", logger.Any("error", err))
		return fmt.Errorf("failed to delete object from storage: %w", err)
	}

	links, err := s.SchedulerObjectLinkRepository.ListByObjectID(ctx, userId, objectId)
	if err != nil {
		logger.Log.Error("failed to list scheduler links for object: ", logger.Any("error", err))
		return fmt.Errorf("failed to list scheduler links for object: %w", err)
	}
	for _, link := range links {
		// Tira o objeto de object_ids do agendador (a lista que de fato conta/exibe os
		// objetos vinculados) -- se o agendador já foi excluído, não é motivo de erro,
		// só não tem mais nada pra limpar ali.
		remainingObjects, err := s.SchedulerRepository.RemoveObjectId(ctx, userId, link.SchedulerId, objectId)
		if err != nil {
			if !errors.Is(err, repository.ErrSchedulerNotFound) {
				logger.Log.Error("failed to remove object from scheduler: ", logger.Any("error", err))
				return fmt.Errorf("failed to remove object from scheduler: %w", err)
			}
		} else if remainingObjects == 0 {
			// Sem objetos, o agendador não tem mais o que gerar -- desliga pra o alarme já
			// agendado no aparelho (que só sabe disso no próximo sync) não disparar em
			// silêncio pra sempre. RAGService.RetrieveAndGenerate tolera esse estado.
			if err := s.SchedulerRepository.Disable(ctx, userId, link.SchedulerId); err != nil {
				logger.Log.Error("failed to disable scheduler with no objects left: ", logger.Any("error", err))
				return fmt.Errorf("failed to disable scheduler with no objects left: %w", err)
			}
		}
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
