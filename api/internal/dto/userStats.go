package dto

import "github.com/joaoleau/floslo/internal/model"

type UserStatsResponseDTO struct {
	CurrentStreak  int            `json:"current_streak"`
	AnsweredByType map[string]int `json:"answered_by_type"`
}

func ToUserStatsResponseDTO(stats *model.UserStats) UserStatsResponseDTO {
	return UserStatsResponseDTO{
		CurrentStreak:  stats.CurrentStreak,
		AnsweredByType: stats.AnsweredByType,
	}
}

type RecordAnswerRequestDTO struct {
	ChallengeType string `json:"challenge_type"`
	LocalDate     string `json:"local_date"`
}
