terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  required_version = ">= 1.8.0"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "assets" {
  bucket = var.bucket_name
}

output "bucket" { value = aws_s3_bucket.assets.bucket }
