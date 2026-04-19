<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".images/logo-dark.png" />
  <img alt="Logo" src=".images/logo-light.png" />
</picture>

---

<div align="center">
    <b>DeFi concepts, workflows, traces, and source analysis.</b>
</div>

---

## Project Structure

This is a PNPM monorepo with the following packages:

| Package | Description |
|---------|-------------|
| [`@protocol-lens/notes`](apps/notes/) | DeFi protocol analysis app |
| [`@protocol-lens/evm-lens`](packages/evm-lens/) | EVM transaction call tracer (browser-native) |
| [`@protocol-lens/evm-lens-indexer`](packages/evm-lens-indexer/) | Hardhat plugin for building trace indexes |
| [`@protocol-lens/evm-lens-ui`](packages/evm-lens-ui/) | React UI components for call trace visualization |
| [`@protocol-lens/protocols`](packages/protocols/) | DeFi protocol source code and pre-built indexes |
| [`@protocol-lens/workflows`](packages/workflows/) | Workflow logic and UI components for DeFi analysis |
| [`@protocol-lens/config`](packages/config/) | Shared ESLint, Prettier, and TSConfig |


## Prerequisites

- Node.js 18+
- PNPM 10.28.2+

## Installation

```bash
git submodule update --init --recursive
pnpm install
pnpm --filter @protocol-lens/notes dev
```

## Development

```bash
pnpm run check:types    # Type check all packages
pnpm run lint:fix       # Auto-fix lint issues

# Run tests (evm-lens)
pnpm --filter @protocol-lens/evm-lens test
```

## Tech Stack

TypeScript, PNPM workspaces, React, Tailwind CSS, shadcn/ui, Astro Starlight, tevm, viem, Hardhat
