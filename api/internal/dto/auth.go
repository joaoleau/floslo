package dto

import "github.com/joaoleau/floslo/internal/model"

type LoginRequestDTO struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (dto *LoginRequestDTO) ToModel() *model.User {
	return &model.User{
		Username: dto.Username,
		Password: dto.Password,
	}
}

type RegisterRequestDTO struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (dto *RegisterRequestDTO) ToModel() *model.User {
	return &model.User{
		Username: dto.Username,
		Email:    dto.Email,
		Password: dto.Password,
	}
}

type LoginResponseDTO struct {
	Token string `json:"token"`
	RefreshToken string `json:"refresh_token"`
}

type RefreshTokenRequestDTO struct {
	Token string `json:"refresh_token"`
}

type RefreshTokenResponseDTO struct {
	Token string `json:"token"`
}

type ForgotPasswordRequestDTO struct {
	Email string `json:"email"`
}

type ResetPasswordRequestDTO struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"new_password"`
}

type VerifyResetCodeRequestDTO struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

