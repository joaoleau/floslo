resource "aws_s3vectors_vector_bucket" "floslo-vector" {
  vector_bucket_name = var.vector_bucket_name
}

resource "aws_s3vectors_index" "vector-index" {
  index_name         = var.vector_index
  vector_bucket_name = aws_s3vectors_vector_bucket.floslo-vector.vector_bucket_name

  data_type       = "float32"
  dimension       = 1024
  distance_metric = var.distance_metric

  metadata_configuration {
    non_filterable_metadata_keys = ["AMAZON_BEDROCK_TEXT", "AMAZON_BEDROCK_METADATA"]
  }
}

resource "aws_bedrockagent_knowledge_base" "floslo-kb" {
  name     = "floslo-kb"
  role_arn = aws_iam_role.floslo-kb-role.arn

  knowledge_base_configuration {
    vector_knowledge_base_configuration {
      embedding_model_arn = var.embedding_model_arn
      embedding_model_configuration {
        bedrock_embedding_model_configuration {
          dimensions          = 1024
          embedding_data_type = "FLOAT32"
        }
      }
    }
    type = "VECTOR"
  }

  storage_configuration {
    type = "S3_VECTORS"
    s3_vectors_configuration {
      index_arn = aws_s3vectors_index.vector-index.index_arn
    }
  }
}

resource "aws_bedrockagent_data_source" "floslo-ds" {
  knowledge_base_id = aws_bedrockagent_knowledge_base.floslo-kb.id
  name              = "floslo-ds"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn         = data.aws_s3_bucket.floslo-bucket.arn
      inclusion_prefixes = [var.s3_context_prefix]
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens         = var.chunk_max_tokens
        overlap_percentage = var.chunk_overlap_percentage
      }
    }
  }
}