package handler

import (
	"net/http"
	"fmt"
	"github.com/joaoleau/floslo/internal/middleware"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/dto"
)

type KnowledgeBaseHandler struct {
	KnowledgeBaseService *service.KnowledgeBaseService
}

func NewKnowledgeBaseHandler(knowledgeBaseService *service.KnowledgeBaseService) *KnowledgeBaseHandler {
	return &KnowledgeBaseHandler{
		KnowledgeBaseService: knowledgeBaseService,
	}
}

func (h *KnowledgeBaseHandler) RetrieveAndGenerate(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	input, err := utils.Deserialize[dto.RetrieveAndGenerateRequest](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	quiz, err := h.KnowledgeBaseService.RetrieveAndGenerate(r.Context(), username, input.SchedulerId, input.DocumentNames)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithData(w, http.StatusCreated, dto.RetrieveAndGenerateResponse{
		SchedulerId: input.SchedulerId,
		Name: input.Name,
		DocumentNames: input.DocumentNames,
		Quiz: quiz,
	})
}