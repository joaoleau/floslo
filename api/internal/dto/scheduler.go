package dto

import (
	"time"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/utils"
)

type QuizChallengeConfigDTO struct {
	Difficulty    string `json:"difficulty"`
	QuestionCount int    `json:"question_count"`
}

type ChallengerDTO struct {
	ChallengeType string                 `json:"challenge_type"`
	Challenge     QuizChallengeConfigDTO `json:"challenge"`
}

func challengerDTOsToModel(challengers []ChallengerDTO) []model.Challenger {
	values := make([]model.Challenger, len(challengers))
	for i, c := range challengers {
		values[i] = model.Challenger{
			ChallengeType: c.ChallengeType,
			Challenge: model.QuizChallengeConfig{
				Difficulty:    c.Challenge.Difficulty,
				QuestionCount: c.Challenge.QuestionCount,
			},
		}
	}
	return values
}

func challengersToDTOList(challengers []model.Challenger) []ChallengerDTO {
	values := make([]ChallengerDTO, len(challengers))
	for i, c := range challengers {
		values[i] = ChallengerDTO{
			ChallengeType: c.ChallengeType,
			Challenge: QuizChallengeConfigDTO{
				Difficulty:    c.Challenge.Difficulty,
				QuestionCount: c.Challenge.QuestionCount,
			},
		}
	}
	return values
}

type CreateSchedulerRequestDTO struct {
	Name           string   `json:"name"`
	WeekDays       []string `json:"weekdays"`
	StartTime      string   `json:"start_time"`
	AlarmSound     string   `json:"alarm_sound"`
	Vibration      bool     `json:"vibration"`
	ObjectIds   []string `json:"object_ids"`
	Challengers []ChallengerDTO `json:"challengers"`
	Enabled        bool     `json:"enabled"`
}

func (dto *CreateSchedulerRequestDTO) ToModel() *model.Scheduler {
	weekdays := make([]model.Weekday, len(dto.WeekDays))

	for i, day := range dto.WeekDays {
		weekdays[i] = model.Weekday(day)
	}

	return &model.Scheduler{
		Name:           dto.Name,
		WeekDays:       weekdays,
		StartTime:      dto.StartTime,
		AlarmSound:     dto.AlarmSound,
		Vibration:      dto.Vibration,
		ObjectIds:   dto.ObjectIds,
		Challengers: challengerDTOsToModel(dto.Challengers),
		Enabled:          dto.Enabled,
	}
}

type SchedulerResponseDTO struct {
	SchedulerId    string   `json:"scheduler_id"`
	Name           string   `json:"name"`
	WeekDays       []string `json:"weekdays"`
	StartTime      string   `json:"start_time"`
	AlarmSound     string   `json:"alarm_sound"`
	Vibration      bool     `json:"vibration"`
	ObjectIds   []string `json:"object_ids"`
	Challengers []ChallengerDTO `json:"challengers"`
	Enabled        bool     `json:"enabled"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type GetSchedulerResponseDTO struct {
	SchedulerId    string   `json:"scheduler_id"`
	Name           string   `json:"name"`
	WeekDays       []string `json:"weekdays"`
	StartTime      string   `json:"start_time"`
	AlarmSound     string   `json:"alarm_sound"`
	Vibration      bool     `json:"vibration"`
	ObjectIds   []string `json:"object_ids"`
	Challengers []ChallengerDTO `json:"challengers"`
	Enabled        bool     `json:"enabled"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type UpdateSchedulerRequestDTO struct {
	Name           *string   `json:"name"`
	WeekDays       *[]string `json:"weekdays"`
	StartTime      *string   `json:"start_time"`
	AlarmSound     *string   `json:"alarm_sound"`
	Vibration      *bool     `json:"vibration"`
	ObjectIds   *[]string `json:"object_ids"`
	Challengers *[]ChallengerDTO `json:"challengers"`
	Enabled        *bool     `json:"enabled"`
}

func (dto *UpdateSchedulerRequestDTO) ToModel() *model.UpdateScheduler {
	var weekdays *[]model.Weekday

	if dto.WeekDays != nil {
		values := make([]model.Weekday, len(*dto.WeekDays))
		for i, day := range *dto.WeekDays {
			values[i] = model.Weekday(day)
		}
		weekdays = &values
	}

	var challengers *[]model.Challenger
	if dto.Challengers != nil {
		values := challengerDTOsToModel(*dto.Challengers)
		challengers = &values
	}

	return &model.UpdateScheduler{
		Name:            dto.Name,
		WeekDays:        weekdays,
		StartTime:       dto.StartTime,
		AlarmSound:      dto.AlarmSound,
		Vibration:       dto.Vibration,
		ObjectIds:    dto.ObjectIds,
		Challengers: challengers,
		Enabled:         dto.Enabled,
	}
}

type ListSchedulersResponseDTO struct {
	Schedulers []*SchedulerResponseDTO `json:"schedulers"`
}

func ToSchedulerResponseDTOList(schedulers []*model.Scheduler) []*SchedulerResponseDTO {
	result := make([]*SchedulerResponseDTO, len(schedulers))
	for i, scheduler := range schedulers {
		result[i] = &SchedulerResponseDTO{
			SchedulerId:    scheduler.Id,
			Name:           scheduler.Name,
			WeekDays:       utils.WeekdaysToStrings(scheduler.WeekDays),
			StartTime:      scheduler.StartTime,
			AlarmSound:     scheduler.AlarmSound,
			Vibration:      scheduler.Vibration,
			ObjectIds:   scheduler.ObjectIds,
			Challengers: challengersToDTOList(scheduler.Challengers),
			Enabled:        scheduler.Enabled,
			CreatedAt:      scheduler.CreatedAt,
			UpdatedAt:      scheduler.UpdatedAt,
		}
	}

	return result
}
