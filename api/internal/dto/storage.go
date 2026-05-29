package dto

import (
	"net/http"
)

type ObjectRequestDTO struct {
	ObjectName string `json:"object_name"`
}

type PresignObjectResponseDTO struct {
	URL string `json:"url"`
	Method string `json:"method"`
	SignedHeader http.Header `json:"signed_header"`
}

type ListObjectResponseDTO struct {
	Objects []string `json:"objects"`
}