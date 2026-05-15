package config

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	
	"github.com/aws/aws-sdk-go-v2/service/bedrockagent"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"

	"github.com/joaoleau/floslo/internal/config/logger"
)

const (
	DynamoTable = "DYNAMO_TABLE"
	BucketName  = "BUCKET_NAME"
	JWTSecret   = "PARAMETER_JWT_SECRET"
	Environment = "ENVIRONMENT"
	KnowledgeBaseId = "KNOWLEDGEBASE_ID"
	DataSourceId = "DATASOURCE_ID"
	ModelId = "MODEL_ID"
)

type Config struct {
	DynamoTable  string
	DynamoClient *dynamodb.Client
	SSMClient    *ssm.Client
	S3Client     *s3.Client
	BucketName   string
	JWTSecret    []byte
	
	BedrockClient	 *bedrockagent.Client
	BedrockAgentRuntimeClient *bedrockagentruntime.Client
	BedrockRuntimeClient *bedrockruntime.Client
	KnowledgeBaseId string
	DataSourceId string
	ModelId string
}

func NewConfig(ctx context.Context) (*Config, error) {
	env := os.Getenv(Environment)

	dynamoTable := os.Getenv(DynamoTable)
	if dynamoTable == "" {
		return nil, fmt.Errorf("DYNAMO_TABLE environment variable is required")
	}

	bucketName := os.Getenv(BucketName)
	if bucketName == "" {
		return nil, fmt.Errorf("BUCKET_NAME environment variable is required")
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

	//RAG
	knowledgeBaseId := os.Getenv(KnowledgeBaseId)
	if knowledgeBaseId == "" {
		return nil, fmt.Errorf("KNOWLEDGEBASE_ID environment variable is required")
	}

	dataSourceId := os.Getenv(DataSourceId)
	if dataSourceId == "" {
		return nil, fmt.Errorf("DATASOURCE_ID environment variable is required")
	}

	modelId := os.Getenv(ModelId)
	if modelId == "" {
		return nil, fmt.Errorf("MODEL_ID environment variable is required")
	}	

	bedrockClient := bedrockagent.NewFromConfig(cfg)
	bedrockAgentRuntimeClient := bedrockagentruntime.NewFromConfig(cfg)
	bedrockRuntimeClient := bedrockruntime.NewFromConfig(cfg)
	//

	logger.Log.Info("config initialized successfully", logger.String("environment", env), logger.String("dynamo_table", dynamoTable), logger.String("bucket_name", bucketName))
	return &Config{
		DynamoTable:  dynamoTable,
		DynamoClient: dynamoClient,
		SSMClient:    ssmClient,
		S3Client:     s3.NewFromConfig(cfg),
		BucketName:   bucketName,
		JWTSecret:    jwtSecret,
		
		BedrockClient: bedrockClient,
		BedrockAgentRuntimeClient: bedrockAgentRuntimeClient,
		BedrockRuntimeClient: bedrockRuntimeClient,
		KnowledgeBaseId: knowledgeBaseId,
		DataSourceId: dataSourceId,
		ModelId: modelId,

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