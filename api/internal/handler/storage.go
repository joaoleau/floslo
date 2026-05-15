package handler

import (
	"net/http"
	"fmt"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/dto"
)

type StorageHandler struct {
	StorageService *service.StorageService
}

func NewStorageHandler(storageService *service.StorageService) *StorageHandler {
	return &StorageHandler{
		StorageService: storageService,
	}
}

func (h *StorageHandler) UploadObject(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	input, err := utils.Deserialize[dto.ObjectRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	
	presign, err := h.StorageService.PresignPutObject(r.Context(), username, input.ObjectName, int64(15))
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	metadataPresign, err := h.StorageService.PresignPutObject(r.Context(), username, input.ObjectName+"metadata.json", int64(360))
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	metadataPresignData, err := h.StorageService.CreateInitialMetadata(r.Context(), username, input.ObjectName)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusOK, dto.FullPresignObjectResponseDTO{
		Object: dto.PresignObjectResponseDTO{
			URL: presign.URL,
			Method: presign.Method,
			SignedHeader: presign.SignedHeader,
		},
		Metadata: dto.PresignMetadataResponseDTO{
			URL: metadataPresign.URL,
			Method: metadataPresign.Method,
			SignedHeader: metadataPresign.SignedHeader,
			ObjectMetadata: metadataPresignData,
		},
	})
}

func (h *StorageHandler) DownloadObject(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	input, err := utils.Deserialize[dto.ObjectRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	
	presign, err := h.StorageService.PresignGetObject(r.Context(), username, input.ObjectName, int64(360))
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.PresignObjectResponseDTO{
		URL: presign.URL,
		Method: presign.Method,
		SignedHeader: presign.SignedHeader,
	})
}

func (h *StorageHandler) DeleteObject(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	input, err := utils.Deserialize[dto.ObjectRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	err = h.StorageService.DeleteObject(r.Context(), username, input.ObjectName)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithMessage(w, http.StatusOK, "Object deleted successfully")
}

func (h *StorageHandler) ListObjects(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}
	objectNames, err := h.StorageService.ListObjects(r.Context(), username)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.ListObjectResponseDTO{
		Objects: objectNames,
	})
}