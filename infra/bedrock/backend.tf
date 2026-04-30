terraform {
  backend "s3" {
    bucket = "floslo-us-east-1"
    key    = "infra/bedrock/terraform.tfstate"
    region = "us-east-1"
  }
}