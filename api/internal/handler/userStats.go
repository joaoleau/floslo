package handler

import (
	"fmt"
	"net/http"

	"github.com/joaoleau/floslo/internal/dto"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
)

type UserStatsHandler struct {
	userStatsService *service.UserStatsService
}

func NewUserStatsHandler(userStatsService *service.UserStatsService) *UserStatsHandler {
	return &UserStatsHandler{
		userStatsService: userStatsService,
	}
}

func (h *UserStatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	stats, err := h.userStatsService.GetStats(r.Context(), userId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.ToUserStatsResponseDTO(stats))
}

func (h *UserStatsHandler) RecordAnswer(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	input, err := utils.Deserialize[dto.RecordAnswerRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	if err := h.userStatsService.RecordAnswer(r.Context(), userId, input.ChallengeType, input.LocalDate); err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	utils.ResponseWithMessage(w, http.StatusOK, "Answer recorded successfully")
}
