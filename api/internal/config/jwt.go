package config

import (
	"fmt"
	"os"
)

func LoadJWTSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}
	return []byte(secret), nil
}