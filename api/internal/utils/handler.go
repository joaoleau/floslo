package utils

import (
	"encoding/json"
	"net/http"
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
