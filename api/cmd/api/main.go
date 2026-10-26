package main

import (
	"context"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	proxy "github.com/awslabs/aws-lambda-go-api-proxy/chi"
	config "github.com/joaoleau/floslo/internal/config"
	logger "github.com/joaoleau/floslo/internal/config/logger"
	irepository "github.com/joaoleau/floslo/internal/repository"
	iservice "github.com/joaoleau/floslo/internal/service"
	ihandler "github.com/joaoleau/floslo/internal/handler"
	imiddleware "github.com/joaoleau/floslo/internal/middleware"
)

var adapter *proxy.ChiLambdaV2

type Repositories struct {
	UserRepository *irepository.UserRepository
	PasswordResetRepository *irepository.PasswordResetRepository
	SchedulerRepository *irepository.SchedulerRepository
	SchedulerObjectLinkRepository *irepository.SchedulerObjectLinkRepository
	ObjectRepository *irepository.ObjectRepository
}

type Services struct {
	UserService *iservice.UserService
	AuthService *iservice.AuthService
	EmailService *iservice.EmailService
	StorageService *iservice.StorageService
	SchedulerService *iservice.SchedulerService
	EmbeddingService *iservice.EmbeddingService
	VectorService *iservice.VectorService
	ObjectService *iservice.ObjectService
}

type Handlers struct {
	UserHandler *ihandler.UserHandler
	AuthHandler *ihandler.AuthHandler
	StorageHandler *ihandler.StorageHandler
	SchedulerHandler *ihandler.SchedulerHandler
	ObjectHandler *ihandler.ObjectHandler
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
	if cfg.SESSenderEmail == "" {
		logger.Log.Error("failed to initialize config: ", logger.Any("error", "SES_SENDER_EMAIL environment variable is required"))
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
	
	r.Route("/api", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", handlers.AuthHandler.Register)
			r.Post("/login", handlers.AuthHandler.Login)
			r.Post("/refresh", handlers.AuthHandler.RefreshToken)
			r.Post("/forgot-password", handlers.AuthHandler.ForgotPassword)
			r.Post("/verify-reset-code", handlers.AuthHandler.VerifyResetCode)
			r.Post("/reset-password", handlers.AuthHandler.ResetPassword)
		})

		r.Group(func(r chi.Router) {
			r.Use(imiddleware.JWTMiddleware(cfg))
			r.Get("/user/me", handlers.UserHandler.GetMe)
			r.Put("/user/me", handlers.UserHandler.UpdateMe)
			r.Delete("/user/me", handlers.UserHandler.DeleteMe)
		})

		r.Group(func(r chi.Router) {
			r.Use(imiddleware.JWTMiddleware(cfg))
			r.Get("/storage/list", handlers.StorageHandler.ListObjects)
			r.Post("/storage/upload", handlers.StorageHandler.UploadObject)
			r.Post("/storage/download", handlers.StorageHandler.DownloadObject)
			r.Delete("/storage/delete", handlers.StorageHandler.DeleteObject)
		})

		r.Group(func(r chi.Router) {
			r.Use(imiddleware.JWTMiddleware(cfg))
			r.Post("/scheduler", handlers.SchedulerHandler.CreateScheduler)
			r.Get("/scheduler/{id}", handlers.SchedulerHandler.GetSchedulerById)
			r.Put("/scheduler/{id}", handlers.SchedulerHandler.UpdateSchedulerById)
			r.Delete("/scheduler/{id}", handlers.SchedulerHandler.DeleteSchedulerById)
			r.Get("/scheduler", handlers.SchedulerHandler.ListSchedulers)
		})

		r.Group(func(r chi.Router) {
			r.Use(imiddleware.JWTMiddleware(cfg))
			r.Get("/objects", handlers.ObjectHandler.ListObjects)
			r.Get("/objects/{id}", handlers.ObjectHandler.GetObjectById)
			r.Put("/objects/{id}/tags", handlers.ObjectHandler.UpdateObjectTags)
			r.Put("/objects/{id}/name", handlers.ObjectHandler.UpdateObjectName)
			r.Delete("/objects/{id}", handlers.ObjectHandler.DeleteObject)
		})
	})
}

func setupHandlers(services *Services) *Handlers {
	return &Handlers{
		UserHandler: ihandler.NewUserHandler(services.UserService),
		AuthHandler: ihandler.NewAuthHandler(services.AuthService),
		StorageHandler: ihandler.NewStorageHandler(services.StorageService),
		SchedulerHandler: ihandler.NewSchedulerHandler(services.SchedulerService),
		ObjectHandler: ihandler.NewObjectHandler(services.ObjectService),
	}
}

func setupServices(cfg *config.Config, repos *Repositories) *Services {
	storageService := iservice.NewStorageService(cfg.BucketName, cfg.S3Client, cfg.MaxUploadSizeBytes)
	embeddingService := iservice.NewEmbeddingService(cfg.BedrockRuntimeClient, cfg.EmbeddingModelId)
	vectorService := iservice.NewVectorService(cfg.S3VectorsClient, embeddingService, cfg.VectorBucketName, cfg.VectorIndexName)
	schedulerService := iservice.NewSchedulerService(repos.SchedulerRepository, repos.SchedulerObjectLinkRepository, storageService)
	objectService := iservice.NewObjectService(repos.ObjectRepository, repos.SchedulerRepository, repos.SchedulerObjectLinkRepository, storageService, vectorService, iservice.TagLimits{MaxLength: cfg.TagMaxLength, MaxPerObject: cfg.MaxTagsPerObject})
	emailService := iservice.NewEmailService(cfg.SESClient, cfg.SESSenderEmail)

	return &Services{
		UserService: iservice.NewUserService(repos.UserRepository, objectService, schedulerService, storageService),
		AuthService: iservice.NewAuthService(repos.UserRepository, repos.PasswordResetRepository, emailService, cfg.JWTSecret),
		EmailService: emailService,
		StorageService: storageService,
		SchedulerService: schedulerService,
		EmbeddingService: embeddingService,
		VectorService: vectorService,
		ObjectService: objectService,
	}
}

func setupRepositories(db *dynamodb.Client, table string) *Repositories {
	return &Repositories{
		UserRepository: irepository.NewUserRepository(db, table),
		PasswordResetRepository: irepository.NewPasswordResetRepository(db, table),
		SchedulerRepository: irepository.NewSchedulerRepository(db, table),
		SchedulerObjectLinkRepository: irepository.NewSchedulerObjectLinkRepository(db, table),
		ObjectRepository: irepository.NewObjectRepository(db, table),
	}
}