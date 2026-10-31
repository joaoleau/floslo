package logger

import (
	"log/slog"
	"os"
	"strings"
)

var Log *slog.Logger

const (
	LOG_OUTPUT = "LOG_OUTPUT"
	LOG_LEVEL  = "LOG_LEVEL"
)

func init() {
	var level slog.Level

	switch strings.ToLower(strings.TrimSpace(os.Getenv(LOG_LEVEL))) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	output := os.Stdout

	if strings.ToLower(os.Getenv(LOG_OUTPUT)) == "stderr" {
		output = os.Stderr
	}

	handler := slog.NewJSONHandler(output, &slog.HandlerOptions{
		Level: level,
	})

	Log = slog.New(handler)
}

func String(key, value string) slog.Attr {
	return slog.String(key, value)
}

func Any(key string, value any) slog.Attr {
	return slog.Any(key, value)
}