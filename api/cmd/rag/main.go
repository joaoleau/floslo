package main

import (
	"context"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	proxy "github.com/awslabs/aws-lambda-go-api-proxy/chi"
	config "github.com/joaoleau/floslo/internal/config"
	logger "github.com/joaoleau/floslo/internal/config/logger"
	iservice "github.com/joaoleau/floslo/internal/service"
	ihandler "github.com/joaoleau/floslo/internal/handler"
	imiddleware "github.com/joaoleau/floslo/internal/middleware"
)

var adapter *proxy.ChiLambdaV2

type Services struct {
	StorageService *iservice.StorageService
	KnowledgeBaseService *iservice.KnowledgeBaseService
}

type Handlers struct {
	KnowledgeBaseHandler *ihandler.KnowledgeBaseHandler
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
	services := setupServices(cfg)
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
			r.Post("/retrieve-and-generate", handlers.KnowledgeBaseHandler.RetrieveAndGenerate)
		})
	})
}

func setupHandlers(services *Services) *Handlers {
	return &Handlers{
		KnowledgeBaseHandler: ihandler.NewKnowledgeBaseHandler(services.KnowledgeBaseService),
	}
}

func setupServices(cfg *config.Config) *Services {
	storageService := iservice.NewStorageService(cfg.BucketName, cfg.S3Client)

	return &Services{
		KnowledgeBaseService: iservice.NewKnowledgeBaseService(cfg.BedrockClient, cfg.BedrockAgentRuntimeClient, cfg.BedrockRuntimeClient, storageService, cfg.KnowledgeBaseId, cfg.DataSourceId, cfg.ModelId),
		StorageService: storageService,
	}
}