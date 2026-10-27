package dto

import "path"

// LocalDate é o dia local do aparelho (YYYY-MM-DD), registrado como dia de estudo quando o
// disparo é gerado.
type RAGRequestDTO struct {
	SchedulerId string `json:"scheduler_id"`
	LocalDate   string `json:"local_date"`
}

type MultipleChoiceAlternativeDTO struct {
	Id      string `json:"id"`
	Text    string `json:"text"`
	Correct bool   `json:"correct"`
}

// ObjectKey leva só o nome do arquivo, e não a chave do S3 (tenants/<usuário>/context/...): o
// caminho interno e o identificador do usuário não saem da API.
type ChunkDTO struct {
	Content    string  `json:"content"`
	Score      float64 `json:"score"`
	ObjectKey  string  `json:"object_key"`
	Page       int     `json:"page"`
	ChunkIndex int     `json:"chunk_index"`
	Language   string  `json:"language"`
}

// DocumentName tira da chave do S3 o prefixo do tenant, deixando só o nome do arquivo.
func DocumentName(objectKey string) string {
	if objectKey == "" {
		return ""
	}
	return path.Base(objectKey)
}

type MultipleChoiceDTO struct {
	Question     string                         `json:"question"`
	Alternatives []MultipleChoiceAlternativeDTO `json:"alternatives"`
	Explanation  string                         `json:"explanation"`
	Tag          string                         `json:"tag"`
	SourceChunks []ChunkDTO                     `json:"source_chunks"`
}

// DiscoveryDTO só apresenta o conteúdo, sem pergunta e sem nota.
type DiscoveryDTO struct {
	Title        string     `json:"title"`
	Content      string     `json:"content"`
	Tag          string     `json:"tag"`
	SourceChunks []ChunkDTO `json:"source_chunks"`
}

type TrueFalseDTO struct {
	Statement    string     `json:"statement"`
	Answer       bool       `json:"answer"`
	Explanation  string     `json:"explanation"`
	Tag          string     `json:"tag"`
	SourceChunks []ChunkDTO `json:"source_chunks"`
}

type ChallengeResultDTO struct {
	ChallengeType   string              `json:"challenge_type"`
	Language        string              `json:"language"`
	MultipleChoices []MultipleChoiceDTO `json:"multiple_choices,omitempty"`
	TrueFalses      []TrueFalseDTO      `json:"true_falses,omitempty"`
	Discoveries     []DiscoveryDTO      `json:"discoveries,omitempty"`
}

// CurrentStreak é a sequência de dias de estudo já com o dia do disparo; ausente quando o dia
// não pôde ser registrado.
type RAGResponseDTO struct {
	Scheduler     SchedulerResponseDTO `json:"scheduler"`
	Challenges    []ChallengeResultDTO `json:"challenges"`
	CurrentStreak *int                 `json:"current_streak,omitempty"`
}
