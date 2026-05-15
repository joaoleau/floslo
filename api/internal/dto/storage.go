package dto

import (
	"net/http"
	"github.com/joaoleau/floslo/internal/model"
)

type ObjectRequestDTO struct {
	ObjectName string `json:"object_name"`
}

type PresignObjectResponseDTO struct {
	URL string `json:"url"`
	Method string `json:"method"`
	SignedHeader http.Header `json:"signed_header"`
}

type PresignMetadataResponseDTO struct {
	URL string `json:"url"`
	Method string `json:"method"`
	SignedHeader http.Header `json:"signed_header"`
	ObjectMetadata model.ObjectMetadata `json:"object_metadata"`
}

type FullPresignObjectResponseDTO struct {
	Object PresignObjectResponseDTO `json:"object"`
	Metadata PresignMetadataResponseDTO `json:"metadata"`
}

type ListObjectResponseDTO struct {
	Objects []string `json:"objects"`
}