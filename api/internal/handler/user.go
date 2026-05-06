package handler

import (
	"net/http"
    "fmt"
	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/dto"
	"github.com/joaoleau/floslo/internal/service"
	"github.com/joaoleau/floslo/internal/middleware"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	user, err := h.userService.GetUserByUsername(r.Context(), username)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.UserResponseDTO{
		Username: user.Username,
		Email:    user.Email,
	})
}

func (h *UserHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	input, err := utils.Deserialize[dto.UserUpdateRequestDTO](r)
	if err != nil {
		utils.ResponseWithError(w, http.StatusBadRequest, err)
		return
	}
	updatedUser, err := h.userService.UpdateUserByUsername(r.Context(), username, input.ToModel())
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithData(w, http.StatusOK, dto.UserResponseDTO{
		Username: updatedUser.Username,
		Email:    updatedUser.Email,
	})
}

func (h *UserHandler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	username, ok := r.Context().Value(middleware.UsernameKey).(string)
	if !ok {
		utils.ResponseWithError(w, http.StatusUnauthorized, fmt.Errorf("unauthorized"))
		return
	}

	err := h.userService.DeleteUserByUsername(r.Context(), username)
	if err != nil {
		utils.ResponseWithError(w, http.StatusInternalServerError, err)
		return
	}
	utils.ResponseWithMessage(w, http.StatusOK, "User deleted successfully")
}
