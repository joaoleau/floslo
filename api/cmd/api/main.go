package main

import (
	"context"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/go-chi/chi/v5"
	proxy "github.com/awslabs/aws-lambda-go-api-proxy/chi"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/joaoleau/floslo/internal/config"
	irepository "github.com/joaoleau/floslo/internal/repository"
	iservice "github.com/joaoleau/floslo/internal/service"
	ihandler "github.com/joaoleau/floslo/internal/handler"
	imiddleware "github.com/joaoleau/floslo/internal/middleware"
)

var adapter *proxy.ChiLambda

type Repositories struct {
	UserRepository *irepository.UserRepository
}

type Services struct {
	UserService *iservice.UserService
	AuthService *iservice.AuthService
}

type Handlers struct {
	UserHandler *ihandler.UserHandler
	AuthHandler *ihandler.AuthHandler
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return adapter.ProxyWithContext(ctx, req)
}

func main() {
    ctx := context.Background()
	db, table := config.DynamoClient(ctx)
	r := chi.NewRouter()
    
	repos := setupRepositories(db, table)
	services := setupServices(repos)
	handlers := setupHandlers(services)
	setupRoutes(r, handlers)

	adapter = proxy.New(r)
	lambda.Start(handler)
}

func setupRoutes(r *chi.Mux, handlers *Handlers) {
	r.Use(middleware.Logger)

	r.Route("/api", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", handlers.AuthHandler.Register)
			r.Post("/login", handlers.AuthHandler.Login)
			r.Post("/refresh", handlers.AuthHandler.RefreshToken)
		})

		r.Group(func(r chi.Router) {
			r.Use(imiddleware.JWTMiddleware)

			r.Get("/user/me", handlers.UserHandler.GetMe)
			r.Put("/user/me", handlers.UserHandler.UpdateMe)
			r.Delete("/user/me", handlers.UserHandler.DeleteMe)
		})
	})
}

func setupHandlers(services *Services) *Handlers {
	return &Handlers{
		UserHandler: ihandler.NewUserHandler(services.UserService),
		AuthHandler: ihandler.NewAuthHandler(services.AuthService),
	}
}

func setupServices(repos *Repositories) *Services {
	return &Services{
		UserService: iservice.NewUserService(repos.UserRepository),
		AuthService: iservice.NewAuthService(repos.UserRepository),
	}
}

func setupRepositories(db *dynamodb.Client, table string) *Repositories {
	return &Repositories{
		UserRepository: irepository.NewUserRepository(db, table),
	}
}