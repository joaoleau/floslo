package dto

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/utils"
)

type MultipleChoiceChallengeConfigDTO struct {
	QuestionCount int `json:"question_count"`
}

type TrueFalseChallengeConfigDTO struct {
	QuestionCount int `json:"question_count"`
}

type DiscoveryChallengeConfigDTO struct {
	DiscoveryCount int `json:"discovery_count"`
}

type ChallengerDTO struct {
	ChallengeType string      `json:"challenge_type"`
	Challenge     interface{} `json:"challenge"`
}

func (c *ChallengerDTO) UnmarshalJSON(data []byte) error {
	var envelope struct {
		ChallengeType string          `json:"challenge_type"`
		Challenge     json.RawMessage `json:"challenge"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		return err
	}

	c.ChallengeType = envelope.ChallengeType

	switch model.ChallengeType(envelope.ChallengeType) {
	case model.ChallengeTypeMultipleChoice:
		var cfg MultipleChoiceChallengeConfigDTO
		if err := json.Unmarshal(envelope.Challenge, &cfg); err != nil {
			return fmt.Errorf("invalid multiple choice challenge config: %w", err)
		}
		c.Challenge = cfg
	case model.ChallengeTypeTrueFalse:
		var cfg TrueFalseChallengeConfigDTO
		if err := json.Unmarshal(envelope.Challenge, &cfg); err != nil {
			return fmt.Errorf("invalid true/false challenge config: %w", err)
		}
		c.Challenge = cfg
	case model.ChallengeTypeDiscovery:
		var cfg DiscoveryChallengeConfigDTO
		if err := json.Unmarshal(envelope.Challenge, &cfg); err != nil {
			return fmt.Errorf("invalid discovery challenge config: %w", err)
		}
		c.Challenge = cfg
	default:
		return fmt.Errorf("unknown challenge type: %s", envelope.ChallengeType)
	}

	return nil
}

func ChallengerToDTO(c model.Challenger) ChallengerDTO {
	dto := ChallengerDTO{
		ChallengeType: c.ChallengeType.String(),
	}
	switch c.ChallengeType {
	case model.ChallengeTypeMultipleChoice:
		if c.MultipleChoice != nil {
			dto.Challenge = MultipleChoiceChallengeConfigDTO{QuestionCount: c.MultipleChoice.QuestionCount}
		}
	case model.ChallengeTypeTrueFalse:
		if c.TrueFalse != nil {
			dto.Challenge = TrueFalseChallengeConfigDTO{QuestionCount: c.TrueFalse.QuestionCount}
		}
	case model.ChallengeTypeDiscovery:
		if c.Discovery != nil {
			dto.Challenge = DiscoveryChallengeConfigDTO{DiscoveryCount: c.Discovery.DiscoveryCount}
		}
	}
	return dto
}

func challengerDTOsToModel(challengers []ChallengerDTO) ([]model.Challenger, error) {
	values := make([]model.Challenger, len(challengers))
	for i, c := range challengers {
		m := model.Challenger{
			ChallengeType: model.ChallengeType(c.ChallengeType),
		}
		switch cfg := c.Challenge.(type) {
		case MultipleChoiceChallengeConfigDTO:
			m.MultipleChoice = &model.MultipleChoiceChallengeConfig{QuestionCount: cfg.QuestionCount}
		case TrueFalseChallengeConfigDTO:
			m.TrueFalse = &model.TrueFalseChallengeConfig{QuestionCount: cfg.QuestionCount}
		case DiscoveryChallengeConfigDTO:
			m.Discovery = &model.DiscoveryChallengeConfig{DiscoveryCount: cfg.DiscoveryCount}
		default:
			return nil, fmt.Errorf("unhandled challenge config type for challenge type %s", c.ChallengeType)
		}
		values[i] = m
	}
	return values, nil
}

func challengersToDTOList(challengers []model.Challenger) []ChallengerDTO {
	values := make([]ChallengerDTO, len(challengers))
	for i, c := range challengers {
		values[i] = ChallengerToDTO(c)
	}
	return values
}

type CreateSchedulerRequestDTO struct {
	Name         string          `json:"name"`
	Language     string          `json:"language"`
	WeekDays     []string        `json:"weekdays"`
	StartTime    string          `json:"start_time"`
	AlarmSound   string          `json:"alarm_sound"`
	Vibration    bool            `json:"vibration"`
	SoundEnabled bool            `json:"sound_enabled"`
	ObjectIds    []string        `json:"object_ids"`
	Challengers  []ChallengerDTO `json:"challengers"`
	Enabled      bool            `json:"enabled"`
}

func (dto *CreateSchedulerRequestDTO) ToModel() (*model.Scheduler, error) {
	weekdays := make([]model.Weekday, len(dto.WeekDays))

	for i, day := range dto.WeekDays {
		weekdays[i] = model.Weekday(day)
	}

	challengers, err := challengerDTOsToModel(dto.Challengers)
	if err != nil {
		return nil, err
	}

	return &model.Scheduler{
		Name:         dto.Name,
		Language:     model.Language(dto.Language),
		WeekDays:     weekdays,
		StartTime:    dto.StartTime,
		AlarmSound:   dto.AlarmSound,
		Vibration:    dto.Vibration,
		SoundEnabled: &dto.SoundEnabled,
		ObjectIds:    dto.ObjectIds,
		Challengers:  challengers,
		Enabled:      dto.Enabled,
	}, nil
}

type SchedulerResponseDTO struct {
	SchedulerId  string          `json:"scheduler_id"`
	Name         string          `json:"name"`
	Language     string          `json:"language"`
	WeekDays     []string        `json:"weekdays"`
	StartTime    string          `json:"start_time"`
	AlarmSound   string          `json:"alarm_sound"`
	Vibration    bool            `json:"vibration"`
	SoundEnabled bool            `json:"sound_enabled"`
	ObjectIds    []string        `json:"object_ids"`
	Challengers  []ChallengerDTO `json:"challengers"`
	Enabled      bool            `json:"enabled"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type GetSchedulerResponseDTO struct {
	SchedulerId  string          `json:"scheduler_id"`
	Name         string          `json:"name"`
	Language     string          `json:"language"`
	WeekDays     []string        `json:"weekdays"`
	StartTime    string          `json:"start_time"`
	AlarmSound   string          `json:"alarm_sound"`
	Vibration    bool            `json:"vibration"`
	SoundEnabled bool            `json:"sound_enabled"`
	ObjectIds    []string        `json:"object_ids"`
	Challengers  []ChallengerDTO `json:"challengers"`
	Enabled      bool            `json:"enabled"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type UpdateSchedulerRequestDTO struct {
	Name         *string          `json:"name"`
	Language     *string          `json:"language"`
	WeekDays     *[]string        `json:"weekdays"`
	StartTime    *string          `json:"start_time"`
	AlarmSound   *string          `json:"alarm_sound"`
	Vibration    *bool            `json:"vibration"`
	SoundEnabled *bool            `json:"sound_enabled"`
	ObjectIds    *[]string        `json:"object_ids"`
	Challengers  *[]ChallengerDTO `json:"challengers"`
	Enabled      *bool            `json:"enabled"`
}

func (dto *UpdateSchedulerRequestDTO) ToModel() (*model.UpdateScheduler, error) {
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
		values, err := challengerDTOsToModel(*dto.Challengers)
		if err != nil {
			return nil, err
		}
		challengers = &values
	}

	var language *model.Language
	if dto.Language != nil {
		value := model.Language(*dto.Language)
		language = &value
	}

	return &model.UpdateScheduler{
		Name:         dto.Name,
		Language:     language,
		WeekDays:     weekdays,
		StartTime:    dto.StartTime,
		AlarmSound:   dto.AlarmSound,
		Vibration:    dto.Vibration,
		SoundEnabled: dto.SoundEnabled,
		ObjectIds:    dto.ObjectIds,
		Challengers:  challengers,
		Enabled:      dto.Enabled,
	}, nil
}

type ListSchedulersResponseDTO struct {
	Schedulers []*SchedulerResponseDTO `json:"schedulers"`
}

func BoolOrFallback(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func ToSchedulerResponseDTOList(schedulers []*model.Scheduler) []*SchedulerResponseDTO {
	result := make([]*SchedulerResponseDTO, len(schedulers))
	for i, scheduler := range schedulers {
		result[i] = &SchedulerResponseDTO{
			SchedulerId:  scheduler.Id,
			Name:         scheduler.Name,
			Language:     scheduler.Language.String(),
			WeekDays:     utils.WeekdaysToStrings(scheduler.WeekDays),
			StartTime:    scheduler.StartTime,
			AlarmSound:   scheduler.AlarmSound,
			Vibration:    scheduler.Vibration,
			SoundEnabled: BoolOrFallback(scheduler.SoundEnabled, true),
			ObjectIds:    scheduler.ObjectIds,
			Challengers:  challengersToDTOList(scheduler.Challengers),
			Enabled:      scheduler.Enabled,
			CreatedAt:    scheduler.CreatedAt,
			UpdatedAt:    scheduler.UpdatedAt,
		}
	}

	return result
}
