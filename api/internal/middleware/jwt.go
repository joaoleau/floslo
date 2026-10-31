package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joaoleau/floslo/internal/config"
)

type contextKey string

const UserIdKey contextKey = "user_id"

func JWTMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(auth, "Bearer ")
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method")
				}
				return cfg.JWTSecret, nil
				},
			)

			if err != nil || !token.Valid {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "invalid claims", http.StatusUnauthorized)
				return
			}

			if claims["type"] != "access" {
				http.Error(w,"invalid token type",http.StatusUnauthorized)
				return
			}

			user_id, ok := claims["sub"].(string)
			if !ok {
				http.Error(w, "invalid subject", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(),UserIdKey,user_id)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}