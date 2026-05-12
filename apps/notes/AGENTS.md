## Purpose

Contains analysis for DeFi protocols.
The analysis contains:

- statis analysis: whitepaper concepts, math, source code analysis
- dynamic analysis: function traces, source code navigation, interactive charts

## Tech Stack

Astro Starlight

## Dependencies

- `evm-lens-ui`: React components for displaying transaction call trace, source code, and project files
- Desmos: used for charting, created manually, linked the chart

## What to run after each change

- Auto-fix lint and format: `pnpm run lint:fix`
- Check ts types: `pnpm run check:types"`
- Do NOT build the project

## Extra instructions

- Avoid creating CSS classes; use Tailwind CSS helper classes directly in the component.
