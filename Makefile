SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

IMAGE ?= localhost/portfolio:dev

help: ## List the targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1;33m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install the locked dependencies (no install scripts)
	npm ci --ignore-scripts

dev: ## Rebuild on every change and serve on http://127.0.0.1:4173
	npm run dev

build: ## Build the site into dist/
	npm run build

serve: build ## Serve dist/ with the production headers
	npm run serve

lint: ## Everything the Lint job runs
	npm run lint
	actionlint
	hadolint Dockerfile
	shellcheck scripts/*.sh scripts/ci/*.sh
	yamllint --strict .
	scripts/ci/validate-manifests.sh

test: build ## HTML, links, man page, Playwright end-to-end and axe accessibility
	npm run test:html
	npm run test:links
	npm run test:man
	npx playwright test

lighthouse: build ## Lighthouse budgets (lighthouserc.json)
	npx lhci collect && npx lhci assert

man: build ## Read this site as a real man page
	man -l dist/guerd.1

image: ## Build the container image
	docker build -t $(IMAGE) .

run: image ## Run it like Kubernetes does: read-only, no capabilities, non-root
	docker run --rm --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges -p 8080:8080 $(IMAGE)

tools: ## Install the pinned CLIs (checksums verified) into ~/.local/bin
	scripts/ci/install-tools.sh actionlint hadolint kubeconform kustomize kind cilium k6

kind-up: ## Create the kind cluster with Cilium
	scripts/ci/zero-trust-e2e.sh up

zero-trust: ## Build, deploy and prove the network policies on kind
	docker build -t localhost/portfolio:e2e .
	scripts/ci/zero-trust-e2e.sh deploy
	scripts/ci/zero-trust-e2e.sh test
	scripts/ci/zero-trust-e2e.sh evidence

kind-down: ## Delete the kind cluster
	scripts/ci/zero-trust-e2e.sh down

images: ## Re-render the favicons and the social card
	node scripts/render-images.mjs

clean: ## Remove build and test outputs
	rm -rf dist build test-results playwright-report .lighthouseci k6-summary.*

.PHONY: help install dev build serve lint test lighthouse man image run tools kind-up zero-trust kind-down images clean
