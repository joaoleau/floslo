package main

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	proxy "github.com/awslabs/aws-lambda-go-api-proxy/chi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	config "github.com/joaoleau/floslo/internal/config"
	logger "github.com/joaoleau/floslo/internal/config/logger"
	ihandler "github.com/joaoleau/floslo/internal/handler"
	imiddleware "github.com/joaoleau/floslo/internal/middleware"
	irepository "github.com/joaoleau/floslo/internal/repository"
	iservice "github.com/joaoleau/floslo/internal/service"
)

var adapter *proxy.ChiLambdaV2

type Services struct {
	RAGService		*iservice.RAGService
}

type Repositories struct {
	SchedulerRepository *irepository.SchedulerRepository
	ObjectRepository    *irepository.ObjectRepository
}

type Handlers struct {
	RAGHandler *ihandler.RAGHandler
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return adapter.ProxyWithContextV2(ctx, req)
}

func main() {
	ctx := context.Background()
	cfg, err := config.NewConfig(ctx)
	r := chi.NewRouter()
	if err != nil {
		logger.Log.Error("failed to initialize config: ", logger.Any("error", err),)
		return
	}
	repos := setupRepositories(cfg.DynamoClient, cfg.DynamoTable)
	services := setupServices(cfg, repos)
	handlers := setupHandlers(services)
	setupRoutes(r, handlers, cfg)

	adapter = proxy.NewV2(r)
	lambda.Start(handler)
}

func setupRoutes(r *chi.Mux, handlers *Handlers, cfg *config.Config) {
	r.Use(middleware.Logger)
	
	r.Route("/rag", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(imiddleware.JWTMiddleware(cfg))
			r.Post("/retrieve-and-generate", handlers.RAGHandler.RetrieveAndGenerate)
		})
	})
}

func setupHandlers(services *Services) *Handlers {
	return &Handlers{
		RAGHandler: ihandler.NewRAGHandler(services.RAGService),
	}
}

func setupRepositories(db *dynamodb.Client, table string) *Repositories {
	return &Repositories{
		SchedulerRepository: irepository.NewSchedulerRepository(db, table),
		ObjectRepository: irepository.NewObjectRepository(db, table),
	}
}

func setupServices(cfg *config.Config, repos *Repositories) *Services {
	embeddingService := iservice.NewEmbeddingService(cfg.BedrockRuntimeClient, cfg.EmbeddingModelId)
	vectorService := iservice.NewVectorService(cfg.S3VectorsClient, embeddingService, cfg.VectorBucketName, cfg.VectorIndexName)
	generationService := iservice.NewGenerationService(cfg.BedrockRuntimeClient, cfg.GenerateModelId)
	ragService := iservice.NewRAGService(vectorService, generationService, repos.SchedulerRepository, repos.ObjectRepository)

	return &Services{
		RAGService: ragService,
	}
}