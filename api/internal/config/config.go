package config

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3vectors"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"

	"github.com/joaoleau/floslo/internal/config/logger"
)

const (
	DynamoTable = "DYNAMO_TABLE"
	BucketName  = "BUCKET_NAME"
	VectorBucketName = "VECTOR_BUCKET_NAME"
	VectorIndexName = "VECTOR_INDEX_NAME"
	JWTSecret   = "PARAMETER_JWT_SECRET"
	GenerateModelId = "GENERATE_MODEL_ID"
	EmbeddingModelId = "EMBEDDING_MODEL_ID"
	MaxUploadSizeMB = "MAX_UPLOAD_SIZE_MB"
)

const defaultMaxUploadSizeMB = 500

type Config struct {
	DynamoTable  string
	DynamoClient *dynamodb.Client
	SSMClient    *ssm.Client
	S3Client     *s3.Client
	S3VectorsClient *s3vectors.Client
	BucketName   string
	VectorBucketName string
	VectorIndexName string
	JWTSecret    []byte
	BedrockRuntimeClient *bedrockruntime.Client
	GenerateModelId string
	EmbeddingModelId string
	MaxUploadSizeBytes int64
}

func NewConfig(ctx context.Context) (*Config, error) {
	dynamoTable := os.Getenv(DynamoTable)
	if dynamoTable == "" {
		return nil, fmt.Errorf("DYNAMO_TABLE environment variable is required")
	}

	bucketName := os.Getenv(BucketName)
	if bucketName == "" {
		return nil, fmt.Errorf("BUCKET_NAME environment variable is required")
	}

	vectorBucketName := os.Getenv(VectorBucketName)
	if vectorBucketName == "" {
		return nil, fmt.Errorf("VECTOR_BUCKET_NAME environment variable is required")
	}

	vectorIndexName := os.Getenv(VectorIndexName)
	if vectorIndexName == "" {
		return nil, fmt.Errorf("VECTOR_INDEX_NAME environment variable is required")
	}

	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	ssmClient := ssm.NewFromConfig(cfg)

	jwtParameter := os.Getenv(JWTSecret)
	if jwtParameter == "" {
		return nil, fmt.Errorf("PARAMETER_JWT_SECRET environment variable is required")
	}

	jwtSecret, err := loadSSMParameter(ctx, ssmClient, jwtParameter)
	if err != nil {
		return nil, fmt.Errorf("failed to load JWT secret from SSM: %w", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)

	generateModelId := os.Getenv(GenerateModelId)
	if generateModelId == "" {
		return nil, fmt.Errorf("GENERATE_MODEL_ID environment variable is required")
	}

	embeddingModelId := os.Getenv(EmbeddingModelId)
	if embeddingModelId == "" {
		return nil, fmt.Errorf("EMBEDDING_MODEL_ID environment variable is required")
	}

	bedrockRuntimeClient := bedrockruntime.NewFromConfig(cfg)
	s3Client := s3.NewFromConfig(cfg)
	s3VectorsClient := s3vectors.NewFromConfig(cfg)

	maxUploadSizeMB := defaultMaxUploadSizeMB
	if raw := os.Getenv(MaxUploadSizeMB); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid MAX_UPLOAD_SIZE_MB value %q: %w", raw, err)
		}
		maxUploadSizeMB = parsed
	}
	maxUploadSizeBytes := int64(maxUploadSizeMB) * 1024 * 1024

	logger.Log.Info("config initialized successfully", logger.String("dynamo_table", dynamoTable), logger.String("bucket_name", bucketName))
	return &Config{
		DynamoTable:  dynamoTable,
		DynamoClient: dynamoClient,
		SSMClient:    ssmClient,
		S3Client:     s3Client,
		S3VectorsClient: s3VectorsClient,
		BucketName:   bucketName,
		VectorBucketName: vectorBucketName,
		VectorIndexName: vectorIndexName,
		JWTSecret:    jwtSecret,
		BedrockRuntimeClient: bedrockRuntimeClient,
		GenerateModelId: generateModelId,
		EmbeddingModelId: embeddingModelId,
		MaxUploadSizeBytes: maxUploadSizeBytes,

	}, nil
}

func loadSSMParameter(ctx context.Context, ssmClient *ssm.Client, parameter string) ([]byte, error) {
	param, err := ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(parameter),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to load parameter %s: %w", parameter, err)
	}

	return []byte(*param.Parameter.Value), nil
}