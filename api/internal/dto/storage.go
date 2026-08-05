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

// PresignUploadResponseDTO carries a presigned S3 POST (form-data) request: the client
// must submit these fields, in order, followed by the file itself as the last field.
type PresignUploadResponseDTO struct {
	URL string `json:"url"`
	Fields map[string]string `json:"fields"`
}

type ListObjectResponseDTO struct {
	Objects []string `json:"objects"`
}