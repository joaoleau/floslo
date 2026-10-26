package service

import (
	"context"
	"fmt"
	"time"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/repository"
)

// StreakService mantém a sequência de dias de estudo do usuário. Fica separado do
// UserService porque quem registra o dia é a floslo-rag, ao gerar um disparo, e ela só tem
// acesso ao repositório de usuários.
type StreakService struct {
	userRepository *repository.UserRepository
}

func NewStreakService(userRepository *repository.UserRepository) *StreakService {
	return &StreakService{userRepository: userRepository}
}

// nextStreak decide o novo valor de current_streak dado o último dia ativo conhecido e
// o dia local que acabou de ser reportado. Não regride: um relato do mesmo dia (ou de um
// dia anterior ao último já registrado -- possível vindo de outro aparelho com fuso
// ligeiramente diferente) simplesmente não muda nada, em vez de tentar reconciliar.
func nextStreak(currentStreak int, lastActiveDate string, localDate string) int {
	if lastActiveDate != "" && localDate <= lastActiveDate {
		return currentStreak
	}
	if lastActiveDate != "" {
		if yesterday, err := time.Parse("2006-01-02", localDate); err == nil {
			if yesterday.AddDate(0, 0, -1).Format("2006-01-02") == lastActiveDate {
				return currentStreak + 1
			}
		}
	}
	return 1
}

// Record atualiza a sequência de dias do usuário a partir do dia local do aparelho
// (YYYY-MM-DD) -- vive no próprio item do usuário e funciona igual não importa de qual
// aparelho venha, então trocar de celular não reseta nada: quem manda é o último dia
// registrado no backend, não um SQLite local.
func (s *StreakService) Record(ctx context.Context, userId string, localDate string) (int, error) {
	if _, err := time.Parse("2006-01-02", localDate); err != nil {
		return 0, fmt.Errorf("invalid local_date, expected YYYY-MM-DD: %w", err)
	}

	user, err := s.userRepository.GetUserByUserId(ctx, userId)
	if err != nil {
		logger.Log.Error("failed to get user: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to get user: %w", err)
	}

	updatedStreak := nextStreak(user.CurrentStreak, user.LastActiveDate, localDate)
	newLastActiveDate := user.LastActiveDate
	if localDate > newLastActiveDate {
		newLastActiveDate = localDate
	}

	if updatedStreak == user.CurrentStreak && newLastActiveDate == user.LastActiveDate {
		return user.CurrentStreak, nil
	}

	updatedUser, err := s.userRepository.UpdateStreak(ctx, userId, updatedStreak, newLastActiveDate)
	if err != nil {
		logger.Log.Error("failed to update streak: ", logger.Any("error", err))
		return 0, fmt.Errorf("failed to update streak: %w", err)
	}
	return updatedUser.CurrentStreak, nil
}
