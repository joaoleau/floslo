package handler

import (
	"fmt"
	"net/http"

	"github.com/joaoleau/floslo/internal/dto"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
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

	resp, err := h.RAGService.RetrieveAndGenerate(r.Context(), userId, input.SchedulerId, input.LocalDate)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusCreated, dto.RAGResponseDTO{
		Scheduler: dto.SchedulerResponseDTO{
			SchedulerId:  resp.Scheduler.Id,
			Name:         resp.Scheduler.Name,
				Language:     resp.Scheduler.Language.String(),
			WeekDays:     utils.WeekdaysToStrings(resp.Scheduler.WeekDays),
			StartTime:    resp.Scheduler.StartTime,
			AlarmSound:   resp.Scheduler.AlarmSound,
			Vibration:    resp.Scheduler.Vibration,
			SoundEnabled: dto.BoolOrFallback(resp.Scheduler.SoundEnabled, true),
			ObjectIds:    resp.Scheduler.ObjectIds,
			Challengers:  utils.MapSlice(resp.Scheduler.Challengers, dto.ChallengerToDTO),
			Enabled:      resp.Scheduler.Enabled,
			CreatedAt:    resp.Scheduler.CreatedAt,
			UpdatedAt:    resp.Scheduler.UpdatedAt,
		},
		Challenges:    utils.MapSlice(resp.Challenges, challengeResultToDTO),
		CurrentStreak: resp.CurrentStreak,
	})
}

func chunksToDTO(chunks []service.RetrievedChunk) []dto.ChunkDTO {
	return utils.MapSlice(chunks, func(c service.RetrievedChunk) dto.ChunkDTO {
		return dto.ChunkDTO{
			Content:    c.Content,
			Score:      c.Score,
			ObjectKey:  c.ObjectKey,
			Page:       c.Page,
			ChunkIndex: c.ChunkIndex,
			Language:   c.Language,
		}
	})
}

func challengeResultToDTO(result *service.GeneratedChallengeResult) dto.ChallengeResultDTO {
	res := dto.ChallengeResultDTO{
		ChallengeType: result.ChallengeType,
		Language:      result.Language,
	}

	if result.MultipleChoices != nil {
		res.MultipleChoices = utils.MapSlice(result.MultipleChoices, func(item *service.GeneratedMultipleChoice) dto.MultipleChoiceDTO {
			return dto.MultipleChoiceDTO{
				Question: item.Question,
				Alternatives: utils.MapSlice(item.Alternatives, func(a service.MultipleChoiceAlternative) dto.MultipleChoiceAlternativeDTO {
					return dto.MultipleChoiceAlternativeDTO{
						Id:      a.Id,
						Text:    a.Text,
						Correct: a.Correct,
					}
				}),
				Explanation:  item.Explanation,
				Tag:          item.Tag,
				SourceChunks: chunksToDTO(item.SourceChunks),
			}
		})
	}

	if result.Discoveries != nil {
		res.Discoveries = utils.MapSlice(result.Discoveries, func(item *service.GeneratedDiscovery) dto.DiscoveryDTO {
			return dto.DiscoveryDTO{
				Title:        item.Title,
				Content:      item.Content,
				Tag:          item.Tag,
				SourceChunks: chunksToDTO(item.SourceChunks),
			}
		})
	}

	if result.TrueFalses != nil {
		res.TrueFalses = utils.MapSlice(result.TrueFalses, func(item *service.GeneratedTrueFalse) dto.TrueFalseDTO {
			return dto.TrueFalseDTO{
				Statement:    item.Statement,
				Answer:       item.Answer,
				Explanation:  item.Explanation,
				Tag:          item.Tag,
				SourceChunks: chunksToDTO(item.SourceChunks),
			}
		})
	}

	return res
}
