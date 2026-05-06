package middleware

import (
	"context"
	"net/http"
	"fmt"
	"strings"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joaoleau/floslo/internal/config"
	"github.com/joaoleau/floslo/internal/utils"
)

type contextKey string

const UsernameKey contextKey = "username"

func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, err := extractUserFromRequest(r)
		if err != nil {
			utils.ResponseWithError(w, http.StatusUnauthorized, err)
			return
		}

		ctx := context.WithValue(r.Context(), UsernameKey, username)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func extractUserFromRequest(r *http.Request) (string, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", fmt.Errorf("missing authorization header")
	}

	tokenString := strings.Replace(auth, "Bearer ", "", 1)

	jwtSecret, err := config.LoadJWTSecret()
	if err != nil {
		return "", err
	}
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	username, ok := claims["sub"].(string)
	if !ok {
		return "", fmt.Errorf("invalid token payload")
	}

	return username, nil
}