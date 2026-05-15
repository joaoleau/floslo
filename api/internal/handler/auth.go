package handler

import (
	"net/http"

	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/dto"
	"github.com/joaoleau/floslo/internal/service"
)


type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	input, err := utils.Deserialize[dto.RegisterRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	err = h.authService.Register(r.Context(), input.ToModel())
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}

	utils.ResponseWithMessage(w, http.StatusCreated, "User created successfully")
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	input, err := utils.Deserialize[dto.LoginRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	token, refreshToken, err := h.authService.Login(r.Context(), input.Username, input.Password)
	if err != nil {
		utils.ResponseWithError(w, http.StatusUnauthorized, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.LoginResponseDTO{
		Token: token,
		RefreshToken: refreshToken,
	})
}

func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	input, err := utils.Deserialize[dto.RefreshTokenRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	token, err := h.authService.RefreshToken(r.Context(), input.Token)
	if err != nil {
		utils.ResponseWithError(w, http.StatusUnauthorized, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.RefreshTokenResponseDTO{
		Token: token,
	})
}
