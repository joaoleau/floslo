package dto

import(
	"github.com/joaoleau/floslo/internal/service"
)

type RetrieveAndGenerateRequest struct {
	SchedulerId    string   `json:"scheduler_id"`
	Name           string   `json:"name"`
	DocumentNames   []string `json:"document_names"`
}

type RetrieveAndGenerateResponse struct {
	SchedulerId    string   `json:"scheduler_id"`
	Name           string   `json:"name"`
	DocumentNames   []string `json:"document_names"`
	Quiz *service.GeneratedQuiz `json:"quiz"`
}