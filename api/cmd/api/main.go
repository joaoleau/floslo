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
	SchedulerRepository *irepository.SchedulerRepository
	SchedulerObjectLinkRepository *irepository.SchedulerObjectLinkRepository
}

type Services struct {
	UserService *iservice.UserService
	AuthService *iservice.AuthService
	StorageService *iservice.StorageService
	SchedulerService *iservice.SchedulerService
}

type Handlers struct {
	UserHandler *ihandler.UserHandler
	AuthHandler *ihandler.AuthHandler
	StorageHandler *ihandler.StorageHandler
	SchedulerHandler *ihandler.SchedulerHandler
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
	
	r.Route("/api", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", handlers.AuthHandler.Register)
			r.Post("/login", handlers.AuthHandler.Login)
			r.Post("/refresh", handlers.AuthHandler.RefreshToken)
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
	})
}

func setupHandlers(services *Services) *Handlers {
	return &Handlers{
		UserHandler: ihandler.NewUserHandler(services.UserService),
		AuthHandler: ihandler.NewAuthHandler(services.AuthService),
		StorageHandler: ihandler.NewStorageHandler(services.StorageService),
		SchedulerHandler: ihandler.NewSchedulerHandler(services.SchedulerService),
	}
}

func setupServices(cfg *config.Config, repos *Repositories) *Services {
	storageService := iservice.NewStorageService(cfg.BucketName, cfg.S3Client)

	return &Services{
		UserService: iservice.NewUserService(repos.UserRepository),
		AuthService: iservice.NewAuthService(repos.UserRepository, cfg.JWTSecret),
		StorageService: storageService,
		SchedulerService: iservice.NewSchedulerService(repos.SchedulerRepository, repos.SchedulerObjectLinkRepository,storageService),
	}
}

func setupRepositories(db *dynamodb.Client, table string) *Repositories {
	return &Repositories{
		UserRepository: irepository.NewUserRepository(db, table),
		SchedulerRepository: irepository.NewSchedulerRepository(db, table),
		SchedulerObjectLinkRepository: irepository.NewSchedulerObjectLinkRepository(db, table),
	}
}