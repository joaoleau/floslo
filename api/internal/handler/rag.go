package handler

import (
	"net/http"
	"fmt"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/dto"
)

type RAGHandler struct {
	RAGService *service.RAGService
}

func NewRAGHandler(ragService *service.RAGService) *RAGHandler {
	return &RAGHandler{
		RAGService: ragService,
	}
}

func (h *RAGHandler) RetrieveAndGenerate(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	input, err := utils.Deserialize[dto.RAGRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	resp, err := h.RAGService.RetrieveAndGenerate(r.Context(), userId, input.SchedulerId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusCreated, dto.RAGResponseDTO{
		Scheduler: dto.SchedulerResponseDTO{
			SchedulerId: resp.Scheduler.Id,
			Name: resp.Scheduler.Name,
			WeekDays: utils.WeekdaysToStrings(resp.Scheduler.WeekDays),
			StartTime: resp.Scheduler.StartTime,
			AlarmSound: resp.Scheduler.AlarmSound,
			Vibration: resp.Scheduler.Vibration,
			ObjectIds: resp.Scheduler.ObjectIds,
			Challengers: utils.MapSlice(resp.Scheduler.Challengers, func(c model.Challenger) dto.ChallengerDTO {
				return dto.ChallengerDTO{
					ChallengeType: c.ChallengeType,
					Challenge: dto.QuizChallengeConfigDTO{
						Difficulty:    c.Challenge.Difficulty,
						QuestionCount: c.Challenge.QuestionCount,
					},
				}
			}),
			Enabled: resp.Scheduler.Enabled,
			CreatedAt: resp.Scheduler.CreatedAt,
			UpdatedAt: resp.Scheduler.UpdatedAt,
		},
		Quizzes: utils.MapSlice(resp.Quizzes, func(quiz *service.GeneratedQuiz) dto.GeneratedQuizDTO {
			return dto.GeneratedQuizDTO{
				Question: quiz.Question,
				Alternatives: utils.MapSlice(quiz.Alternatives, func(a service.QuizAlternative) dto.QuizAlternativeDTO {
					return dto.QuizAlternativeDTO{
						Id: a.Id,
						Text: a.Text,
						Correct: a.Correct,
					}
				}),
				Explanation: quiz.Explanation,
				Difficulty: quiz.Difficulty,
				Tag: quiz.Tag,
				SourceChunks: utils.MapSlice(quiz.SourceChunks, func(c service.RetrievedChunk) dto.ChunkDTO {
					return dto.ChunkDTO{
						Content: c.Content,
						Score: c.Score,
						ObjectKey: c.ObjectKey,
						Page: c.Page,
						ChunkIndex: c.ChunkIndex,
						Language: c.Language,
					}
				}),
			}
		}),
	})
}