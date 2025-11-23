# Makefile for @defi-notes/protocols

contracts-clean:
	@echo "cleaning contracts directory..."
	rm -rf contracts/*

hardhat-clean:
	@echo "Cleaning Hardhat..."
	pnpm exec hardhat clean

clean: hardhat-clean contracts-clean
	@echo "All cleaned!"

hardhat-tasks-filter-contracts:
	@echo "Filtering contracts..."
	pnpm exec tsx tasks/filter-contracts.ts

hardhat-build:
	@echo "Building with Hardhat..."
	pnpm exec hardhat build --show-stack-traces

build: clean hardhat-tasks-filter-contracts hardhat-build
	@echo "Build complete!"
