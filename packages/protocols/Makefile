# Makefile for @protocol-lens/protocols

contracts-clean:
	@echo "cleaning contracts directory..."
	rm -rf contracts/*

hardhat-clean:
	@echo "Cleaning Hardhat..."
	pnpm exec hardhat clean

clean: hardhat-clean contracts-clean
	@echo "All cleaned!"

filter-contracts:
	@echo "Filtering contracts..."
	pnpm exec tsx tasks/filter-contracts.ts

change-source:
	@echo "Changing contracts source..."
	pnpm exec tsx tasks/change-source.ts

hardhat-build:
	@echo "Building with Hardhat..."
	pnpm exec hardhat build --show-stack-traces

build: clean filter-contracts change-source hardhat-build
	@echo "Build complete!"
