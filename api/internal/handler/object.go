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

type ObjectHandler struct {
	ObjectService *service.ObjectService
}

func NewObjectHandler(objectService *service.ObjectService) *ObjectHandler {
	return &ObjectHandler{
		ObjectService: objectService,
	}
}

func (h *ObjectHandler) ListObjects(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	objects, err := h.ObjectService.ListObjects(r.Context(), userId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.ListObjectsResponseDTO{
		Objects: dto.ToObjectResponseDTOList(objects),
	})
}

func (h *ObjectHandler) GetObjectById(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	id := chi.URLParam(r, "id")
	object, err := h.ObjectService.GetObjectById(r.Context(), userId, id)
	if err != nil {
		utils.ResponseWithError(w, http.StatusNotFound, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.ToObjectResponseDTO(object))
}

func (h *ObjectHandler) UpdateObjectTags(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	id := chi.URLParam(r, "id")
	input, err := utils.Deserialize[dto.UpdateObjectTagsRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	updatedObject, err := h.ObjectService.UpdateObjectTags(r.Context(), userId, id, input.Tags)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.ToObjectResponseDTO(updatedObject))
}

func (h *ObjectHandler) UpdateObjectName(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	id := chi.URLParam(r, "id")
	input, err := utils.Deserialize[dto.UpdateObjectNameRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	updatedObject, err := h.ObjectService.UpdateObjectName(r.Context(), userId, id, input.Name)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.ToObjectResponseDTO(updatedObject))
}

func (h *ObjectHandler) DeleteObject(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	id := chi.URLParam(r, "id")

	if err := h.ObjectService.DeleteObject(r.Context(), userId, id); err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithMessage(w, http.StatusOK, "Object deleted successfully")
}
