resource "aws_iam_role" "floslo-kb-role" {
  name = "floslo-kb"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy" "s3-floslo-bucket-ro-policy" {
  name = "s3-floslo-bucket-ro-policy"
  role = aws_iam_role.floslo-kb-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketReadPermission"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          data.aws_s3_bucket.floslo-bucket.arn,
          "${data.aws_s3_bucket.floslo-bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3-floslo-vector-bucket-rw-policy" {
  name = "s3-floslo-vector-bucket-rw-policy"
  role = aws_iam_role.floslo-kb-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "S3VectorBucketReadAndWritePermission",
        Action = [
          "s3vectors:PutVectors",
          "s3vectors:GetVectors",
          "s3vectors:DeleteVectors",
          "s3vectors:QueryVectors",
          "s3vectors:GetIndex"
        ]
        Effect   = "Allow"
        Resource = aws_s3vectors_index.vector-index.index_arn
      },
    ]
  })
}

resource "aws_iam_role_policy" "bedrock-model-invoke" {
  name = "bedrock-model-invoke"
  role = aws_iam_role.floslo-kb-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "bedrock:InvokeModel",
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate"
        ],
        Resource = var.embedding_model_arn
      }
    ]
  })
}