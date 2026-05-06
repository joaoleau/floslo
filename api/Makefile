TABLE_NAME=floslo
REGION=sa-east-1
DYNAMO_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=fake
AWS_SECRET_ACCESS_KEY=fake
AWS_REGION=sa-east-1
SAM="/c/Program Files/Amazon/AWSSAMCLI/bin/sam.cmd"

sync:
	@echo "Rebuilding and restarting SAM..."
	@make build
	@make run-bg

build:
	GOOS=linux GOARCH=amd64 go build -o bootstrap cmd/main.go

clean:
	rm -f bootstrap

run:
	sam local start-api

run-bg:
	@echo "Restarting SAM..."
	@if [ -f .sam.pid ]; then kill -9 $$(cat .sam.pid) || true; fi
	@$(SAM) local start-api & echo $$! > .sam.pid

dynamo-up:
	docker-compose -f docker-compose.dynamo.yml up -d

dynamo-down:
	docker-compose -f docker-compose.dynamo.yml down

dynamo-create:
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
	AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
	aws dynamodb create-table \
		--table-name $(TABLE_NAME) \
		--attribute-definitions \
			AttributeName=PK,AttributeType=S \
			AttributeName=SK,AttributeType=S \
		--key-schema \
			AttributeName=PK,KeyType=HASH \
			AttributeName=SK,KeyType=RANGE \
		--billing-mode PAY_PER_REQUEST \
		--endpoint-url $(DYNAMO_ENDPOINT) \
		--region $(REGION)

dynamo-delete:
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
	AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
	aws dynamodb delete-table \
		--table-name $(TABLE_NAME) \
		--endpoint-url $(DYNAMO_ENDPOINT) \
		--region $(REGION)

dynamo-scan:
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
	AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
	aws dynamodb scan \
		--table-name $(TABLE_NAME) \
		--endpoint-url $(DYNAMO_ENDPOINT) \
		--region $(REGION)

dynamo-reset: dynamo-delete dynamo-create