# Makefile for @defi-notes/protocols

.PHONY: check-types contracts-clear hardhat-clear clear hardhat-build types-barrel \
        hardhat-tasks-source-maps hardhat-tasks-filter-contracts build help

# Default target
.DEFAULT_GOAL := help

# Check TypeScript types without emitting files
check-types:
	@echo "Checking TypeScript types..."
	tsc --noEmit

# Remove all contract artifacts
contracts-clear:
	@echo "Clearing contracts directory..."
	rm -rf contracts/*

# Clean Hardhat cache and artifacts
hardhat-clear:
	@echo "Cleaning Hardhat..."
	hardhat clean

# Clear everything (hardhat + contracts)
clear: hardhat-clear contracts-clear
	@echo "All cleared!"

# Build contracts with Hardhat
hardhat-build:
	@echo "Building with Hardhat..."
	hardhat build

# Generate barrel exports for types
types-barrel:
	@echo "Generating type barrel exports..."
	ctix build

# Inject source maps into artifacts
hardhat-tasks-source-maps:
	@echo "Injecting source maps..."
	tsx tasks/inject-sourcemaps.ts

# Filter contracts before building
hardhat-tasks-filter-contracts:
	@echo "Filtering contracts..."
	tsx tasks/filter-contracts.ts

# Full build pipeline
build: clear hardhat-tasks-filter-contracts hardhat-build hardhat-tasks-source-maps types-barrel
	@echo "Build complete!"

# Help target - shows available commands
help:
	@echo "Available targets:"
	@echo "  make check-types                    - Check TypeScript types"
	@echo "  make contracts-clear                - Remove contracts directory"
	@echo "  make hardhat-clear                  - Clean Hardhat cache"
	@echo "  make clear                          - Clear everything"
	@echo "  make hardhat-build                  - Build with Hardhat"
	@echo "  make types-barrel                   - Generate type exports"
	@echo "  make hardhat-tasks-source-maps      - Inject source maps"
	@echo "  make hardhat-tasks-filter-contracts - Filter contracts"
	@echo "  make build                          - Run full build pipeline"
	@echo "  make help                           - Show this help message"