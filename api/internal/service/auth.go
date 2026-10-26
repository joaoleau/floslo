package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
	"github.com/joaoleau/floslo/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

const passwordResetCodeTTL = 15 * time.Minute

func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}
	var hasLetter, hasNumber bool
	for _, r := range password {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsNumber(r):
			hasNumber = true
		}
	}
	if !hasLetter || !hasNumber {
		return fmt.Errorf("password must contain at least one letter and one number")
	}
	return nil
}

type AuthService struct {
	userRepository          *repository.UserRepository
	passwordResetRepository *repository.PasswordResetRepository
	emailService            *EmailService
	jwtSecret               []byte
}

func NewAuthService(
	userRepository *repository.UserRepository,
	passwordResetRepository *repository.PasswordResetRepository,
	emailService *EmailService,
	jwtSecret []byte,
) *AuthService {
	return &AuthService{
		userRepository:          userRepository,
		passwordResetRepository: passwordResetRepository,
		emailService:            emailService,
		jwtSecret:               jwtSecret,
	}
}

// Versão vigente dos Termos de uso e da Política de privacidade. Mantenha em sincronia com
// TERMS_VERSION em mobile/src/constants/terms.ts: quando o texto mudar, as duas sobem juntas.
const TermsVersion = "2026-10-26"

// ValidateTermsAcceptance exige que o cadastro traga o aceite da versão vigente dos termos.
func ValidateTermsAcceptance(version string) error {
	if version != TermsVersion {
		return fmt.Errorf("terms of use must be accepted")
	}
	return nil
}

func (s *AuthService) Register(ctx context.Context, user *model.User) error {
	if err := ValidateTermsAcceptance(user.TermsVersion); err != nil {
		return err
	}
	if user.Username == "" {
		return fmt.Errorf("username is required")
	}
	if user.Password == "" {
		return fmt.Errorf("password is required")
	}
	if user.Email == "" {
		return fmt.Errorf("email is required")
	}
	if err := ValidatePasswordStrength(user.Password); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Id = utils.GenerateID("usr")
	user.Password = string(hash)
	user.SetKeys()
	user.CreatedAt = time.Now().UTC()
	user.UpdatedAt = user.CreatedAt
	user.TermsAcceptedAt = user.CreatedAt
	err = s.userRepository.NewUser(ctx, user)
	if err != nil {
		logger.Log.Error("failed to create user: ", logger.Any("error", err))
		return fmt.Errorf("failed to create user: %w", err)
	}

	if err := s.userRepository.SaveEmailLookup(ctx, model.NewEmailLookup(user.Email, user.Id)); err != nil {
		logger.Log.Error("failed to save email lookup for new user: ", logger.Any("error", err))
	}

	logger.Log.Info("user created: ", logger.String("username", user.Username))
	return nil
}

func (s *AuthService) Login(ctx context.Context, identifier, password string) (string, string, error) {
	var user *model.User
	var err error
	if strings.Contains(identifier, "@") {
		user, err = s.userRepository.GetUserByEmail(ctx, identifier)
	} else {
		user, err = s.userRepository.GetUserByUsername(ctx, identifier)
	}
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

func generateResetCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("failed to generate reset code: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.userRepository.GetUserByEmail(ctx, email)
	if err != nil {
		logger.Log.Info("forgot-password requested for an email with no matching account")
		return nil
	}

	code, err := generateResetCode()
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash reset code: %w", err)
	}

	now := time.Now().UTC()
	expiresAt := now.Add(passwordResetCodeTTL)
	resetCode := &model.PasswordResetCode{
		UserId:    user.Id,
		CodeHash:  string(hash),
		ExpiresAt: expiresAt.Unix(),
		TTL:       expiresAt.Unix(),
		CreatedAt: now,
	}
	resetCode.SetKeys()

	if err := s.passwordResetRepository.Save(ctx, resetCode); err != nil {
		return err
	}

	if err := s.emailService.SendPasswordResetCode(ctx, user.Email, user.Username, code); err != nil {
		return err
	}

	logger.Log.Info("password reset code sent: ", logger.String("user_id", user.Id))
	return nil
}

func (s *AuthService) getValidResetCode(ctx context.Context, email string, code string) (*model.User, error) {
	genericErr := fmt.Errorf("invalid or expired code")

	user, err := s.userRepository.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, genericErr
	}

	resetCode, err := s.passwordResetRepository.Get(ctx, user.Id)
	if err != nil {
		return nil, genericErr
	}
	if resetCode.IsExpired() {
		return nil, genericErr
	}
	if err := bcrypt.CompareHashAndPassword([]byte(resetCode.CodeHash), []byte(code)); err != nil {
		return nil, genericErr
	}

	return user, nil
}

func (s *AuthService) VerifyResetCode(ctx context.Context, email string, code string) error {
	_, err := s.getValidResetCode(ctx, email, code)
	return err
}

func (s *AuthService) ResetPasswordWithCode(ctx context.Context, email string, code string, newPassword string) error {
	if err := ValidatePasswordStrength(newPassword); err != nil {
		return err
	}

	user, err := s.getValidResetCode(ctx, email, code)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	user.Password = string(hash)
	user.UpdatedAt = time.Now().UTC()
	if _, err := s.userRepository.UpdateUserByUserId(ctx, user.Id, user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	if err := s.passwordResetRepository.Delete(ctx, user.Id); err != nil {
		logger.Log.Error("failed to delete used password reset code: ", logger.Any("error", err))
	}

	logger.Log.Info("password reset completed: ", logger.String("user_id", user.Id))
	return nil
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
