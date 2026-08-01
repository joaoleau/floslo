package dto

import (
	"time"

	"github.com/joaoleau/floslo/internal/model"
)

type ObjectResponseDTO struct {
	Id        string    `json:"id"`
	Name      string    `json:"name"`
	Tags      []string  `json:"tags"`
	Language  string    `json:"language"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func ToObjectResponseDTO(o *model.Object) *ObjectResponseDTO {
	return &ObjectResponseDTO{
		Id:        o.Id,
		Name:      o.Name,
		Tags:      o.Tags,
		Language:  o.Language,
		Status:    o.Status,
		CreatedAt: o.CreatedAt,
		UpdatedAt: o.UpdatedAt,
	}
}

func ToObjectResponseDTOList(objects []*model.Object) []*ObjectResponseDTO {
	result := make([]*ObjectResponseDTO, len(objects))
	for i, o := range objects {
		result[i] = ToObjectResponseDTO(o)
	}
	return result
}

type ListObjectsResponseDTO struct {
	Objects []*ObjectResponseDTO `json:"objects"`
}

type UpdateObjectTagsRequestDTO struct {
	Tags []string `json:"tags"`
}
