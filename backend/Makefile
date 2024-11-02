# Makefile for VoxPup Backend

# Specify the shell to use (optional, defaults to /bin/sh)
SHELL := /bin/bash

# Phony targets are not actual files
.PHONY: install dev migrate generate studio seed lint format test help

# Variables
DB_URL := $(shell grep DATABASE_URL .env | cut -d '=' -f2)

# Display help
help:
	@echo "VoxPup Backend Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install     Install backend dependencies"
	@echo "  dev         Run the development server"
	@echo "  migrate     Run Prisma migrations"
	@echo "  generate    Generate Prisma client"
	@echo "  sql         Open Prisma Studio"
	@echo "  seed        Seed the database"
	@echo "  lint        Lint the codebase"
	@echo "  format      Format the codebase"
	@echo "  test        Run tests"
	@echo "  help        Show this help message"

# Install backend dependencies
install:
	@echo "Installing backend dependencies..."
	npm install

# Run the development server
dev:
	@echo "Starting the development server..."
	npm run dev

# Run Prisma migrations
migrate:
	@echo "Running Prisma migrations..."
	npx prisma migrate dev

# Generate Prisma client
generate:
	@echo "Generating Prisma client..."
	npx prisma generate

# Open Prisma Studio
sql:
	@echo "Opening Prisma Studio..."
	npx prisma studio

# Seed the database
seed:
	@echo "Seeding the database..."
	npx prisma db seed

# Lint the codebase
lint:
	@echo "Linting the codebase..."
	npm run lint

# Format the codebase
format:
	@echo "Formatting the codebase..."
	npm run format

# Run tests
test:
	@echo "Running tests..."
	npm run test
