# Compiles the two Go lambdas (BuildMethod go1.x in template.yml, bootstrap binaries for
# provided.al2023) and pip-installs the processor's requirements.txt into .aws-sam/build.
# Required before `deploy` — `sam deploy` alone won't build anything.
sam-build:
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

.PHONY: sam-build deploy sync sync-code
