package dto

import "github.com/joaoleau/floslo/internal/model"

type UserUpdateRequestDTO struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (dto *UserUpdateRequestDTO) ToModel() *model.User {
	return &model.User{
		Username: dto.Username,
		Email:    dto.Email,
		Password: dto.Password,
	}
}