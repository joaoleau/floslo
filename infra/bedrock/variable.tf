variable "vector_bucket_name" {
  default     = "floslo-vector-us-east-1"
  type        = string
}

variable "vector_index" {
  default     = "titan"
  type        = string
}

variable "embedding_model_arn" {
  default     = "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
  type        = string
}

variable "distance_metric" {
  type        = string
  default     = "cosine"
}

variable "chunk_max_tokens" {
  type    = number
  default = 512
}

variable "chunk_overlap_percentage" {
  type    = number
  default = 15
}

variable "s3_context_prefix" {
  type    = string
  default = "context/"
}