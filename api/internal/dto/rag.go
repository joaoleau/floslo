package dto

type RAGRequestDTO struct {
	SchedulerId    string   `json:"scheduler_id"`
}

type QuizAlternativeDTO struct {
	Id      string `json:"id"`
	Text    string `json:"text"`
	Correct bool   `json:"correct"`
}

type ChunkDTO struct {
	Content    string  `json:"content"`
	Score      float64 `json:"score"`
	ObjectKey  string  `json:"object_key"`
	Page       int     `json:"page"`
	ChunkIndex int     `json:"chunk_index"`
	Language   string  `json:"language"`
}

type GeneratedQuizDTO struct {
	Question     string             `json:"question"`
	Alternatives []QuizAlternativeDTO  `json:"alternatives"`
	Explanation  string             `json:"explanation"`
	Difficulty   string             `json:"difficulty"`
	Tag          string             `json:"tag"`
	SourceChunks []ChunkDTO   `json:"source_chunks"`
}

type RAGResponseDTO struct {
	Scheduler SchedulerResponseDTO `json:"scheduler"`
	Quizzes []GeneratedQuizDTO `json:"quizzes"`
}