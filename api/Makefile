sam-build:
	sam build

deploy: sam-build
	sam deploy

sync:
	sam sync --stack-name floslo

sync-code:
	sam sync --code --stack-name floslo

.PHONY: sam-build deploy sync sync-code
