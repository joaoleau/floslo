package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/utils"
	"github.com/joaoleau/floslo/internal/repository"
	"github.com/joaoleau/floslo/internal/config/logger"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepository *repository.UserRepository
	jwtSecret 	[]byte
}

func NewAuthService(userRepository *repository.UserRepository, jwtSecret []byte) *AuthService {
	return &AuthService{
		userRepository: userRepository,
		jwtSecret:      jwtSecret,
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

	user.Id = utils.GenerateID("usr")
	user.Password = string(hash)
	user.SetKeys()
	user.CreatedAt = time.Now().UTC()
	user.UpdatedAt = time.Now().UTC()
	err = s.userRepository.NewUser(ctx, user)
	if err != nil {
		logger.Log.Error("failed to create user: ", logger.Any("error", err))
		return fmt.Errorf("failed to create user: %w", err)
	}
	logger.Log.Info("user created: ", logger.String("username", user.Username))
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

	access, err := generateAccessToken(s.jwtSecret, user.Id)
	if err != nil {
		return "", "", err
	}

	refresh, err := generateRefreshToken(s.jwtSecret, user.Id)
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
		return s.jwtSecret, nil
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

	userId, ok := claims["sub"].(string)
	if !ok {
		return "", fmt.Errorf("invalid subject")
	}

	return generateAccessToken(s.jwtSecret, userId)
}


func generateAccessToken(jwtSecret []byte, userId string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  userId,
		"type": "access",
		"iss":  "floslo",
		"aud":  "floslo-app",
		"exp":  time.Now().Add(15 * time.Minute).Unix(),
	})

	return token.SignedString(jwtSecret)
}

func generateRefreshToken(jwtSecret []byte, userId string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  userId,
		"type": "refresh",
		"iss":  "floslo",
		"aud":  "floslo-app",
		"exp":  time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	return token.SignedString(jwtSecret)
}