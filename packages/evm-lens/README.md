# evm-lens

A browser-based EVM transaction call tracer that provides source-level visibility into EVM execution. 

Focuses on reconstructing the complete call trace with decoded parameters, return values, and source mappings.

## Design Decisions

- **Browser-First**: Runs entirely in browser, no backend node required
- **Index-Based**: Requires pre-built indexes for performance
- **Source-Centric**: Maps execution back to Solidity source code

## Pipeline

Processes EVM execution events through 6 stages:

- **Filter** — Filters raw TEVM events (`InterpreterStep`, `Message`, `EvmResult`)
- **Adapter** — Maps to standardized `EvmEvent` objects (opcode, stack, PC)
- **Enrich** — Adds source context using PC Location Indexes (file, line, jump type)
- **Opcode Analysis** — Detects function entry/exit via JUMP analysis and external call opcodes; uses Function Indexes
- **Decoding** — Decodes ABI data (params, results, logs, errors) and labels addresses using Artifacts
- **Trace Builder** — Constructs hierarchical `FunctionTraceCall` tree

## Required Indexes

evm-lens requires pre-built indexes from [`evm-lens-indexer`](../evm-lens-indexer/):

- **Artifacts** — Contract ABIs, bytecodes, source paths (used in Stage 5 for ABI decoding)
- **Function Indexes** — Function names, selectors, visibility, line ranges (used in Stage 4 for function detection)
- **PC Location Indexes** — Program counter → source location mappings (used in Stage 3 for source enrichment)

## Usage

```typescript
import { buildCallTracer } from '@protocol-lens/evm-lens';
import { privateKeyToAccount } from 'viem/accounts';

// 1. Build the call tracer
const account = privateKeyToAccount('0x...');
const { lensClient } = await buildCallTracer(account);

// 2. Register indexes from a resource loader
await lensClient.registerIndexes(resourceLoader, 'my-protocol');

// 3. Deploy contracts
const deployResult = await lensClient.deploy(
  'src/MyContract.sol:MyContract',
  [constructorArg1]
);

// 4. Get contract instance and execute with tracing
const contract = lensClient.getContract(
  deployResult.createdAddress!,
  'src/MyContract.sol:MyContract'
);

const functionTrace = await lensClient.contract(
  contract,
  'myFunction',
  [arg1, arg2]
);

// functionTrace contains the complete hierarchical call tree
```

### Trace Output Structure

```typescript
{
  type: 'FunctionCallEvent',
  to: '0x...',
  from: '0x...',
  depth: 0,
  callType: 'CALL', // or STATICCALL, DELEGATECALL, CREATE, INTERNAL
  contractFQN: 'src/Contract.sol:Contract',
  functionName: 'transfer',
  args: { to: '0x...', amount: 1000n },
  functionLineStart: 45,
  functionLineEnd: 52,
  functionSource: 'src/Contract.sol',
  called: [ /* nested FunctionCallEvent objects */ ],
  result: {
    type: 'FunctionResultEvent',
    isError: false,
    returnValue: true,
    logs: [ /* decoded events */ ]
  }
}
```

## Visualization

The output can be visualized using [`evm-lens-ui`](../evm-lens-ui/), which provides interactive call trace trees, source code display, and decoded value inspection.

## Technology Stack

- **[TEVM](https://tevm.sh)**: In-browser EVM implementation (ethereumjs-based)
- **[Viem](https://viem.sh)**: Ethereum interaction library
- **TypeScript**

## Development

```bash
# Run tests
pnpm run test

# Type checking
pnpm run check:types
```
