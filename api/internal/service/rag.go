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
	Quizzes []*GeneratedQuiz `json:"quizzes"`
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

	count, difficulty := s.resolveChallengeConfig(scheduler.Challengers)

	topK := 3 + count*3
	if topK < 7 {
		topK = 7
	}

	chunks, err := s.VectorService.RetrieveRelevantChunks(ctx,userId, object.Key, query, int32(topK))
	if err != nil {
		return nil, err
	}
	if len(chunks) == 0 {
		return nil, fmt.Errorf("no chunks found")
	}

	selected := s.diversifyChunks(chunks, count)
	contextText := s.buildContext(selected)
	quizzes, err := s.GenerationService.GenerateQuizzes(
		ctx,
		query,
		tag,
		contextText,
		count,
		difficulty,
	)

	if err != nil {
		return nil, err
	}
	for _, quiz := range quizzes {
		quiz.SourceChunks = selected
	}
	return &RetrieveAndGenerateResponse{
		Scheduler: scheduler,
		Quizzes: quizzes,
	}, nil
}

func (s *RAGService) resolveChallengeConfig(challengers []model.Challenger) (int, string) {
	count := 1
	difficulty := "medium"

	for _, challenger := range challengers {
		if challenger.ChallengeType == "QUIZ" {
			count = challenger.Challenge.QuestionCount
			difficulty = challenger.Challenge.Difficulty
			break
		}
	}

	if count < 1 {
		count = 1
	}
	if count > 10 {
		count = 10
	}

	return count, difficulty
}

func (s *RAGService) diversifyChunks(chunks []RetrievedChunk, count int) []RetrievedChunk {
	anchorSize := 3
	if len(chunks) < anchorSize {
		anchorSize = len(chunks)
	}

	extraSize := 2 * count

	if len(chunks) <= anchorSize+extraSize {
		return chunks
	}

	selected := make([]RetrievedChunk, anchorSize)
	copy(selected, chunks[:anchorSize])

	remaining := chunks[anchorSize:]

	rand.Shuffle(len(remaining), func(i, j int) {
		remaining[i], remaining[j] = remaining[j], remaining[i]
	})

	selected = append(selected, remaining[:extraSize]...)

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