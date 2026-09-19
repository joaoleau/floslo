package service

import (
	"context"
	"fmt"
	"math/rand"
	"strings"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
)

type GeneratedChallengeResult struct {
	ChallengeType string                `json:"challenge_type"`
	Language      string                `json:"language"`
	Quizzes       []*GeneratedQuiz      `json:"quizzes,omitempty"`
	Flashcards    []*GeneratedFlashcard `json:"flashcards,omitempty"`
	TrueFalses    []*GeneratedTrueFalse `json:"true_falses,omitempty"`
}

type RetrieveAndGenerateResponse struct {
	Scheduler  *model.Scheduler            `json:"scheduler"`
	Challenges []*GeneratedChallengeResult `json:"challenges"`
}

type RAGService struct {
	VectorService       *VectorService
	GenerationService   *GenerationService
	SchedulerRepository *repository.SchedulerRepository
	ObjectRepository    *repository.ObjectRepository
}

func NewRAGService(vectorService *VectorService, generationService *GenerationService, schedulerRepository *repository.SchedulerRepository, objectRepository *repository.ObjectRepository) *RAGService {
	return &RAGService{
		VectorService:       vectorService,
		GenerationService:   generationService,
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

	selectedTags := s.selectTags(object.Tags)

	logger.Log.Info(
		"selected object and tags for RAG",
		logger.String("object_id", object.Id),
		logger.String("object_name", object.Name),
		logger.Any("tags", selectedTags),
	)

	queries := make([]string, len(selectedTags))
	for i, selectedTag := range selectedTags {
		queries[i] = s.generateQuery(selectedTag)
	}
	joinedQuery := strings.Join(queries, "; ")

	if len(scheduler.Challengers) == 0 {
		return nil, fmt.Errorf("scheduler has no challengers")
	}

	results := make([]*GeneratedChallengeResult, 0, len(scheduler.Challengers))
	for _, challenger := range scheduler.Challengers {
		count := challengeCount(challenger)

		topK := 3 + count*3
		if topK < 7 {
			topK = 7
		}

		perQueryTopK := int32(topK) / int32(len(queries))
		if perQueryTopK < 3 {
			perQueryTopK = 3
		}

		language := string(challenger.Language)
		chunks, err := s.VectorService.RetrieveRelevantChunksMultiForLanguage(ctx, userId, object.Key, queries, perQueryTopK, language)
		if err != nil {
			return nil, err
		}
		if len(chunks) == 0 {
			return nil, fmt.Errorf("no chunks found for challenger %s", challenger.ChallengeType)
		}

		selected := s.diversifyChunks(chunks, count)
		contextText := s.buildContext(selected)

		result := &GeneratedChallengeResult{
			ChallengeType: string(challenger.ChallengeType),
			Language:      language,
		}

		switch challenger.ChallengeType {
		case model.ChallengeTypeQuiz:
			quizzes, err := s.GenerationService.GenerateQuizzes(ctx, joinedQuery, selectedTags, contextText, count, challenger.Quiz.Difficulty, language)
			if err != nil {
				return nil, err
			}
			for _, quiz := range quizzes {
				quiz.SourceChunks = selected
			}
			result.Quizzes = quizzes
		case model.ChallengeTypeFlashcard:
			flashcards, err := s.GenerationService.GenerateFlashcards(ctx, joinedQuery, selectedTags, contextText, count, language)
			if err != nil {
				return nil, err
			}
			for _, card := range flashcards {
				card.SourceChunks = selected
			}
			result.Flashcards = flashcards
		case model.ChallengeTypeTrueFalse:
			items, err := s.GenerationService.GenerateTrueFalse(ctx, joinedQuery, selectedTags, contextText, count, challenger.TrueFalse.Difficulty, language)
			if err != nil {
				return nil, err
			}
			for _, item := range items {
				item.SourceChunks = selected
			}
			result.TrueFalses = items
		default:
			return nil, fmt.Errorf("unsupported challenge type: %s", challenger.ChallengeType)
		}

		results = append(results, result)
	}

	return &RetrieveAndGenerateResponse{
		Scheduler:  scheduler,
		Challenges: results,
	}, nil
}

func challengeCount(c model.Challenger) int {
	count := 1
	switch c.ChallengeType {
	case model.ChallengeTypeQuiz:
		if c.Quiz != nil {
			count = c.Quiz.QuestionCount
		}
	case model.ChallengeTypeFlashcard:
		if c.Flashcard != nil {
			count = c.Flashcard.CardCount
		}
	case model.ChallengeTypeTrueFalse:
		if c.TrueFalse != nil {
			count = c.TrueFalse.QuestionCount
		}
	}
	if count < 1 {
		count = 1
	}
	if count > maxChallengeItemCount {
		count = maxChallengeItemCount
	}
	return count
}

func (s *RAGService) selectTags(tags []string) []string {
	numTags := 3
	if len(tags) < numTags {
		numTags = len(tags)
	}

	perm := rand.Perm(len(tags))
	selected := make([]string, numTags)
	for i := 0; i < numTags; i++ {
		selected[i] = tags[perm[i]]
	}

	return selected
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

func (s *RAGService) buildContext(chunks []RetrievedChunk) string {
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
