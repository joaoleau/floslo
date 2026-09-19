package handler

import (
	"fmt"
	"net/http"

	"github.com/joaoleau/floslo/internal/dto"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
)

func buildStorageObjectName(objectName string) string {
	return utils.GenerateID("obj") + "/" + objectName
}

type StorageHandler struct {
	StorageService *service.StorageService
}

func NewStorageHandler(storageService *service.StorageService) *StorageHandler {
	return &StorageHandler{
		StorageService: storageService,
	}
}

func (h *StorageHandler) UploadObject(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	input, err := utils.Deserialize[dto.ObjectRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	storageObjectName := buildStorageObjectName(input.ObjectName)
	presign, err := h.StorageService.PresignUploadObject(r.Context(), userId, storageObjectName, int64(360))
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.PresignUploadResponseDTO{
		URL:    presign.URL,
		Fields: presign.Values,
	},
	)
}

func (h *StorageHandler) DownloadObject(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	input, err := utils.Deserialize[dto.ObjectRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	presign, err := h.StorageService.PresignGetObject(r.Context(), userId, input.ObjectName, int64(360))
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.PresignObjectResponseDTO{
		URL:          presign.URL,
		Method:       presign.Method,
		SignedHeader: presign.SignedHeader,
	})
}

func (h *StorageHandler) DeleteObject(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	input, err := utils.Deserialize[dto.ObjectRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	err = h.StorageService.DeleteObject(r.Context(), userId, input.ObjectName)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithMessage(w, http.StatusOK, "Object deleted successfully")
}

func (h *StorageHandler) ListObjects(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(middleware.UserIdKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	objectNames, err := h.StorageService.ListObjects(r.Context(), userId)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.ListObjectResponseDTO{
		Objects: objectNames,
	})
}
