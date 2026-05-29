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
	Content    string
	Score      float64
	ObjectKey  string
	Page       int
	ChunkIndex int
	Language   string
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
	Quiz GeneratedQuizDTO `json:"quiz"`
}