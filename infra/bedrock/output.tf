output "knowledge_base_id" {
  value = aws_bedrockagent_knowledge_base.floslo-kb.id
}

output "vector_index_arn" {
  value = aws_s3vectors_index.vector-index.index_arn
}

output "data_source_id" {
  value = aws_bedrockagent_data_source.floslo-ds.id
}

output "vector_bucket_name" {
  value = aws_s3vectors_vector_bucket.floslo-vector.vector_bucket_name
}