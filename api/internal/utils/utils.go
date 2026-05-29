package utils

import (
	"encoding/json"
	"net/http"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/google/uuid"
)

type ResponseBody struct {
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func response(w http.ResponseWriter, status int, body ResponseBody) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func responseData(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func ResponseWithError(w http.ResponseWriter, status int, err error) {
	response(w, status, ResponseBody{
		Error:   err.Error(),
	})
}

func ResponseWithMessage(w http.ResponseWriter, status int, message string) {
	response(w, status, ResponseBody{
		Message: message,
	})
}

func ResponseWithData(w http.ResponseWriter, status int, data interface{}) {
	responseData(w, status, data)
}

func Serialize[T any](obj T) ([]byte, error) {
	var body []byte
	body, err := json.Marshal(obj)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func Deserialize[T any](r *http.Request) (*T, error) {
	var t T
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

func Coalesce[T comparable](a, b T) T {
    var zero T
    if a == zero {
        return b
    }
    return a
}

func WeekdaysToStrings(days []model.Weekday) []string {
	result := make([]string, len(days))

	for i, day := range days {
		result[i] = day.String()
	}

	return result
}

func GenerateID(prefix string) string {
	id := uuid.NewString()

	if prefix == "" {
		return id
	}

	return prefix + "_" + id
}

func MapSlice[T any, U any](input []T, mapper func(T) U) []U {
	result := make([]U, len(input))	
	for i, item := range input {
		result[i] = mapper(item)
	}
	return result
}