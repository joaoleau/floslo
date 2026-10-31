package dto

import (
	"time"

	"github.com/joaoleau/floslo/internal/model"
)

type UserUpdateRequestDTO struct {
	Username        *string `json:"username"`
	Password        *string `json:"password"`
	CurrentPassword *string `json:"current_password"`
}

func (dto *UserUpdateRequestDTO) ToModel() *model.UpdateUser {
	return &model.UpdateUser{
		Username:        dto.Username,
		Password:        dto.Password,
		CurrentPassword: dto.CurrentPassword,
	}
}

type UserResponseDTO struct {
	Id            string    `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	CurrentStreak int       `json:"current_streak"`
	LastActiveDate string    `json:"last_active_date"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
