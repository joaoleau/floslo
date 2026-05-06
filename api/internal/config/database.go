package config


// import (
// 	"context"
// 	"os"

// 	"github.com/aws/aws-sdk-go-v2/aws"
// 	"github.com/aws/aws-sdk-go-v2/config"
// 	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
// )

// func DynamoClient(ctx context.Context) (*dynamodb.Client, string) {
// 	cfg, err := config.LoadDefaultConfig(ctx)
// 	if err != nil {
// 		panic(err)
// 	}

// 	tableName := os.Getenv("TABLE_NAME")
// 	if tableName == "" {
// 		panic("TABLE_NAME environment variable is required")
// 	}

// 	client := dynamodb.NewFromConfig(cfg)

// 	return client, tableName
// }

//APENAS TESTE LOCAL
import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/joaoleau/floslo/internal/config/logger"
)

var client *dynamodb.Client
var tableName string = "floslo" 

func DynamoClient(ctx context.Context) (*dynamodb.Client, string) {
	customResolver := aws.EndpointResolverWithOptionsFunc(
		func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           "http://host.docker.internal:8000",
				SigningRegion: "sa-east-1",
			}, nil
		})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("sa-east-1"),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		logger.Error("failed to load database: ", err)
	}

	client = dynamodb.NewFromConfig(cfg)
	return client, tableName
}
