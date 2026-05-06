package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joaoleau/floslo/internal/config"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
	"golang.org/x/crypto/bcrypt"

	"github.com/joaoleau/floslo/internal/config/logger"
	"go.uber.org/zap"
)

type AuthService struct {
	userRepository *repository.UserRepository
}

func NewAuthService(userRepository *repository.UserRepository) *AuthService {
	return &AuthService{
		userRepository: userRepository,
	}
}

func (s *AuthService) Register(ctx context.Context, user *model.User) error {
	if user.Username == "" {
		return fmt.Errorf("username is required")
	}
	if user.Password == "" {
		return fmt.Errorf("password is required")
	}
	if user.Email == "" {
		return fmt.Errorf("email is required")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Password = string(hash)
	user.SetKeys()
	
	err = s.userRepository.NewUser(ctx, user)
	if err != nil {
		logger.Error("failed to create user: ", err)
		return fmt.Errorf("failed to create user: %w", err)
	}
	logger.Info("user created: ", zap.String("username", user.Username))
	return nil
}

func (s *AuthService) Login(ctx context.Context, username, password string) (string, string, error) {
	user, err := s.userRepository.GetUserByUsername(ctx, username)
	if err != nil {
		return "", "", fmt.Errorf("invalid credentials")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return "", "", fmt.Errorf("invalid credentials")
	}

	access, err := generateAccessToken(user.Username)
	if err != nil {
		return "", "", err
	}

	refresh, err := generateRefreshToken(user.Username)
	if err != nil {
		return "", "", err
	}

	return access, refresh, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return config.LoadJWTSecret()
	})

	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	if claims["type"] != "refresh" {
		return "", fmt.Errorf("invalid token type")
	}

	username, ok := claims["sub"].(string)
	if !ok {
		return "", fmt.Errorf("invalid subject")
	}

	return generateAccessToken(username)
}


func generateAccessToken(username string) (string, error) {
	jwtSecret, err := config.LoadJWTSecret()
	if err != nil {
		return "", err
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  username,
		"type": "access",
		"exp":  time.Now().Add(15 * time.Minute).Unix(),
	})

	return token.SignedString(jwtSecret)
}

func generateRefreshToken(username string) (string, error) {
	jwtSecret, err := config.LoadJWTSecret()
	if err != nil {
		return "", err
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  username,
		"type": "refresh",
		"exp":  time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	return token.SignedString(jwtSecret)
}