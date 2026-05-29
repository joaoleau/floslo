package dto

import (
	"time"
	"github.com/joaoleau/floslo/internal/model"
)

type UserUpdateRequestDTO struct {
	Username *string `json:"username"`
	Email    *string `json:"email"`
	Password *string `json:"password"`
}

func (dto *UserUpdateRequestDTO) ToModel() *model.UpdateUser {
	return &model.UpdateUser{
		Username: dto.Username,
		Email:    dto.Email,
		Password: dto.Password,
	}
}

type UserResponseDTO struct {
	Id       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}