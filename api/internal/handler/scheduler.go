package handler

import (
	"net/http"
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/dto"
)

type SchedulerHandler struct {
	SchedulerService *service.SchedulerService
}

func NewSchedulerHandler(schedulerService *service.SchedulerService) *SchedulerHandler {
	return &SchedulerHandler{
		SchedulerService: schedulerService,
	}
}

func (h *SchedulerHandler) CreateScheduler(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	input, err := utils.Deserialize[dto.CreateSchedulerRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	scheduler := input.ToModel()
	err = h.SchedulerService.CreateScheduler(r.Context(), userId, scheduler)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusCreated, dto.SchedulerResponseDTO{
		SchedulerId:    scheduler.Id,
		Name:             scheduler.Name,
		WeekDays:         utils.WeekdaysToStrings(scheduler.WeekDays),
		StartTime:        scheduler.StartTime,
		SnoozeDuration:   scheduler.SnoozeDuration,
		AlarmSound:       scheduler.AlarmSound,
		ObjectIds:   scheduler.ObjectIds,
		Enabled:          scheduler.Enabled,
		CreatedAt:        scheduler.CreatedAt,
		UpdatedAt:        scheduler.UpdatedAt,
	})
}

func (h *SchedulerHandler) GetSchedulerById(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	schedulerId := chi.URLParam(r, "schedulerId")
	scheduler, err := h.SchedulerService.GetSchedulerById(r.Context(), userId, schedulerId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusNotFound, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.GetSchedulerResponseDTO{
		SchedulerId:    scheduler.Id,
		Name:             scheduler.Name,
		WeekDays:         utils.WeekdaysToStrings(scheduler.WeekDays),
		StartTime:        scheduler.StartTime,
		SnoozeDuration:   scheduler.SnoozeDuration,
		AlarmSound:       scheduler.AlarmSound,
		ObjectIds:   	  scheduler.ObjectIds,
		Enabled:          scheduler.Enabled,
		CreatedAt:        scheduler.CreatedAt,
		UpdatedAt:        scheduler.UpdatedAt,
	})
}

func (h *SchedulerHandler) ListSchedulers(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	schedulers, err := h.SchedulerService.ListSchedulers(r.Context(), userId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.ListSchedulersResponseDTO{
		Schedulers: dto.ToSchedulerResponseDTOList(schedulers),
	})
}

func (h *SchedulerHandler) UpdateSchedulerById(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	schedulerId := chi.URLParam(r, "schedulerId")
	input, err := utils.Deserialize[dto.UpdateSchedulerRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	scheduler := input.ToModel()
	scheduler.Id = schedulerId
	updateScheduler, err := h.SchedulerService.UpdateScheduler(r.Context(), userId, scheduler)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.SchedulerResponseDTO{
		SchedulerId:    updateScheduler.Id,
		Name:             updateScheduler.Name,
		WeekDays:         utils.WeekdaysToStrings(updateScheduler.WeekDays),
		StartTime:        updateScheduler.StartTime,
		SnoozeDuration:   updateScheduler.SnoozeDuration,
		AlarmSound:       updateScheduler.AlarmSound,
		ObjectIds:   updateScheduler.ObjectIds,
		Enabled:          updateScheduler.Enabled,
		CreatedAt:        updateScheduler.CreatedAt,
		UpdatedAt:        updateScheduler.UpdatedAt,
	})
}

func (h *SchedulerHandler) DeleteSchedulerById(w http.ResponseWriter, r *http.Request) {
	schedulerId := chi.URLParam(r, "schedulerId")
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	err := h.SchedulerService.DeleteScheduler(r.Context(), userId, schedulerId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithMessage(w, http.StatusOK, "Scheduler deleted successfully")
}
