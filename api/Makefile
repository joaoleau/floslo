build-api:
	GOOS=linux GOARCH=amd64 CGO_ENABLED="0" go build -o cmd/api/build/bootstrap cmd/api/main.go

build-rag:
	GOOS=linux GOARCH=amd64 CGO_ENABLED="0" go build -o cmd/rag/build/bootstrap cmd/rag/main.go

# Compiles both Go lambdas (bootstrap binaries). The `processor` lambda is Python and
# needs no local build step here — `sam build` installs its requirements.txt itself.
build: build-api build-rag

# Bundles all three lambdas into .aws-sam/build: copies the Go bootstraps as-is
# (CodeUri already points at the compiled binaries) and pip-installs the processor's
# dependencies. Required before `deploy` — `sam deploy` alone won't install
# requirements.txt for the Python lambda.
sam-build: build
	sam build

# Publishes the stack to AWS using the parameters already stored in samconfig.toml
# (stack name, region, capabilities). Prompts for changeset confirmation before
# applying, since this touches real infrastructure.
deploy: sam-build
	sam deploy

sync:
	sam sync --stack-name floslo

sync-code:
	sam sync --code --stack-name floslo

.PHONY: build-api build-rag build sam-build deploy sync sync-code
