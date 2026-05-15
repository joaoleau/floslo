build-api:
	GOOS=linux GOARCH=amd64 CGO_ENABLED="0" go build -o cmd/api/build/bootstrap cmd/api/main.go

build-rag:
	GOOS=linux GOARCH=amd64 CGO_ENABLED="0" go build -o cmd/rag/build/bootstrap cmd/rag/main.go

sync:
	sam sync --stack-name floslo