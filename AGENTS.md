# Project Context

- **Purpose**
  - A platform to analyze EVM DeFi protocols written in Solidity documented in `apps/docs`. The platform combines protocol interaction call traces, source code, and white-paper theory.
- **Tech Stack**
  - PNPM, PNPM monorepo, TypeScript
- **Git Workflow**
  - Conventional Commits (feat/fix/etc)
- **Domain Context**
  - DeFi protocol analysis; EVM debugging tools

# Project Conventions

- **Code Style**:
  - Lint and format: `pnpm run lint`
  - Auto-fix lint and format: `pnpm run lint:fix`
  - Avoid creating CSS classes; use Tailwind CSS helper classes directly in the component.
- **Architecture Patterns**:
  - PNPM workspaces
  - Package naming: `@defi-notes/*` for core packages
- **Testing Strategy**:
  - For each package, typecheck with: `pnpm run check:types`
  - Each package has its own testing strategy; some packages do not need tests.

# Monorepo Specific Context

## `packages/config`

- **Purpose**:
  - Shared configs via `packages/config`: ESLint, Prettier, TSConfig

## `packages/evm-lens`

- **Purpose**:
  - EVM transaction call tracer (not a debugger) that runs in the browser.
  - Provides an all-in-one solution: an EVM node, a client, and a transaction opcode analyzer that creates the call trace.
  - Requires pre-built indexes to create the call trace.
- **Tech Stack**:
  - TypeScript, Vite, Vitest, Solidity for tests
- **Important Dependencies**:
  - `tevm`, `viem`, indexes built from `packages/evm-lens-indexer`
- **Constraints**:
  - Browser-compatible
- **Testing Strategy**:
  - Automated tests: `pnpm run test`

## `packages/evm-lens-indexer`

- **Purpose**:
  - A Hardhat plugin that creates indexes for `packages/evm-lens`
- **Tech Stack**:
  - Node.js, Hardhat
- **Testing Strategy**:
  - Validate by running `pnpm run test` in `packages/evm-lens`.
  - Validate by checking for absence of console errors when running `pnpm run build` in `packages/protocols`.

## `packages/workflows`

- **Purpose**:
    - Provides workflow logic and ui components to DeFi `apps/notes`.
- **Tech Stack**:
    - Node.js

## `packages/protocols`

- **Purpose**:
  - Provides DeFi protocol source code and their `evm-lens` indexes.
- **Tech Stack**:
  - Node.js, Hardhat
- **Important Commands**:
  - `pnpm run build` builds DeFi protocol indexes.
- **Important Dependencies**:
  - `packages/evm-lens-indexer` 
  - DeFi protocols as git submodules in `packages/protocols/lib`.

## `packages/evm-lens-ui`

- **Purpose**:
  - Displays the call trace alongside source code and project files.
  - UI for call trace and its respective source code.
- **Tech Stack**:
  - React.js, shadcn, Tailwind CSS

## `apps/notes`

- **Purpose**:
  - Provides notes for DeFi protocols.
- **Tech Stack**:
  - Astro Starlight theme, `packages/harhdat-evm-ui`
