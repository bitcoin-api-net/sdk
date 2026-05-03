.PHONY: help
#? help: Get more info on make commands
help: Makefile
	@echo " Choose a command to run:"
	@sed -n 's/^#?//p' $< | column -t -s ':' |  sort | sed -e 's/^/ /'

.PHONY: pb-api
#? pb-api: Pull, install (if lock changed), build api and restart bitcoin-api service
pb-api:
	git pull --ff-only origin main
	if ! git diff --quiet HEAD@{1} HEAD -- package-lock.json; then npm ci; fi
	npx tsc --build apps/api
	systemctl restart bitcoin-api
	sleep 5
	systemctl status bitcoin-api --no-pager

.PHONY: pb-exchanges
#? pb-exchanges: Pull, install (if lock changed), build exchanges and restart bitcoin-exchanges service
pb-exchanges:
	git pull --ff-only origin main
	if ! git diff --quiet HEAD@{1} HEAD -- package-lock.json; then npm ci; fi
	npx tsc --build apps/exchanges
	systemctl restart bitcoin-exchanges
	sleep 5
	systemctl status bitcoin-exchanges --no-pager

.PHONY: pb-web
#? pb-web: Pull, install (if lock changed) and build web-client (Nginx serves dist)
pb-web:
	git pull --ff-only origin main
	if ! git diff --quiet HEAD@{1} HEAD -- package-lock.json; then npm ci; fi
	npm run build --workspace=apps/web-client

.PHONY: pb-all
#? pb-all: Pull once, build api/exchanges/web-client and restart both services
pb-all:
	git pull --ff-only origin main
	if ! git diff --quiet HEAD@{1} HEAD -- package-lock.json; then npm ci; fi
	npx tsc --build apps/api
	npx tsc --build apps/exchanges
	npm run build --workspace=apps/web-client
	systemctl restart bitcoin-api bitcoin-exchanges
	sleep 5
	systemctl status bitcoin-api bitcoin-exchanges --no-pager
