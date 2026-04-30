data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_s3_bucket" "floslo-bucket" {
  bucket = "floslo-us-east-1"
}