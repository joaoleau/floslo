package service

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"github.com/joaoleau/floslo/internal/repository"
	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
)

type RetrieveAndGenerateResponse struct {
	Scheduler *model.Scheduler `json:"scheduler"`
	Quiz *GeneratedQuiz `json:"quiz"`
}

type RAGService struct {
	VectorService     *VectorService
	GenerationService *GenerationService
	SchedulerRepository *repository.SchedulerRepository
	ObjectRepository    *repository.ObjectRepository
}

func NewRAGService(vectorService *VectorService, generationService *GenerationService, schedulerRepository *repository.SchedulerRepository,objectRepository *repository.ObjectRepository) *RAGService {
	return &RAGService{
		VectorService:      vectorService,
		GenerationService:  generationService,
		SchedulerRepository: schedulerRepository,
		ObjectRepository:    objectRepository,
	}
}

func (s *RAGService) RetrieveAndGenerate(ctx context.Context, userId string, schedulerId string) (*RetrieveAndGenerateResponse, error) {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, userId, schedulerId)
	if err != nil {
		return nil, err
	}
	if len(scheduler.ObjectIds) == 0 {
		return nil, fmt.Errorf("scheduler has no objects")
	}

	objectId := scheduler.ObjectIds[rand.Intn(len(scheduler.ObjectIds))]
	object, err := s.ObjectRepository.GetObjectById(ctx, userId, objectId)
	if err != nil {
		return nil, err
	}

	if len(object.Tags) == 0 {
		return nil, fmt.Errorf("object has no tags")
	}

	tag := object.Tags[rand.Intn(len(object.Tags))]

	logger.Log.Info(
		"selected object and tag for RAG",
		logger.String("object_id", object.Id),
		logger.String("object_name", object.Name),
		logger.String("tag", tag),
	)
	query := s.generateQuery(tag)
	
	chunks, err := s.VectorService.RetrieveRelevantChunks(ctx,userId, object.Key, query, 7)
	if err != nil {
		return nil, err
	}
	if len(chunks) == 0 {
		return nil, fmt.Errorf("no chunks found")
	}

	selected := s.diversifyChunks(chunks)
	contextText := s.buildContext(selected)
	quiz, err := s.GenerationService.GenerateQuiz(
		ctx,
		query,
		tag,
		contextText,
	)

	if err != nil {
		return nil, err
	}
	quiz.SourceChunks = selected
	return &RetrieveAndGenerateResponse{
		Scheduler: scheduler,
		Quiz: quiz,
	}, nil
}

func (s *RAGService) diversifyChunks(chunks []RetrievedChunk) []RetrievedChunk {
	if len(chunks) <= 5 {
		return chunks
	}

	selected := []RetrievedChunk{
		chunks[0],
		chunks[1],
		chunks[2],
	}

	remaining := chunks[3:]

	rand.Shuffle(len(remaining), func(i, j int) {
		remaining[i], remaining[j] = remaining[j], remaining[i]
	})

	selected = append(selected, remaining[:2]...)

	return selected
}

func (s *RAGService) buildContext(chunks []RetrievedChunk,) string {
	var builder strings.Builder
	
	for _, chunk := range chunks {
		builder.WriteString(chunk.Content)
		builder.WriteString("\n\n")
	}

	return builder.String()
}

func (s *RAGService) generateQuery(tag string) string {
	queries := []string{
		tag,
		fmt.Sprintf("concepts about %s", tag),
		fmt.Sprintf("facts about %s", tag),
		fmt.Sprintf("explanations about %s", tag),
		fmt.Sprintf("events related to %s", tag),
	}

	return queries[rand.Intn(len(queries))]
}