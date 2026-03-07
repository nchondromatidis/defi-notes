# TODO

- emv-lens
    - FEAT: FunctionEntryHandler: decode arguments
    - FEAT: FunctionExitHandler: decode result, events, errors
    - ARCH: add logger
    - FEAT: Precompile detection
    - REF: add index.ts
    - REF: break decoding function call: function call, fallback handlers
    - REF: break decoding result: error, result
    - REF: convert anemic to a rich domain model
    - REF: Replace evm objects for external calls and results with raw data (opcodes, stack, memory)
    - ARCH: add new evm handler strategy to detect function calls based on ast + sourcemap
    - BUG: On revert the function not closed (j:out) not showing - ok for now, tracer not designed for reverts
    - FEAT: Register call and result line numbers
    - FEAT: Minify json indexes for prod vs dev
    - ARCH: remove tevm dependency
      - ethereumjs
      - EIP-1193: window.ethereum.request()
- indexer
   - FEAT: Inline lib source lines detection
   - FEAT: detect/decode public variables getters
   - ARCH: use solc instead of hardhat to be able to be used directly in browser
- hardhat-temv-lens
  - FEAT: add support for find reference and go to definition
    - compilation unit: use slang reference <-> definition
    - cross compilation unit: manual import
- evm-lens-ui
    - BUG: clicking traces does not always land to the correct source function
    - FEAT: show events emitted
    - FEAT: show from
    - FEAT: open in new tab
      - escape should not close the editor
      - back-forward should get to previous source file, not previous page
    - FEAT: responsive for mobile devices
    - FEAT: show revert reason
- notes
  - FEAT: Add notes/comments for each doc section for people to share knowledge
  - BUG: desmos dark link mode sync with starlight
  - FEAT: code is too long even on full screen (horizontal scrolling)
  - FEAT: tooltip to explain how the trace is generated
  - FEAT: a green circle that should enforce the intuition that this thing is live
  - FEAT: code slices, add github repo link and function name

// trying to tone down optimizer
{
  "viaIR": true,
  "optimizer": {
  "enabled": false,
    "details": {
      "yul": false,
      "yulDetails": { "optimizerSteps": ":" },
      "peephole": false,
      "jumpdestRemover": false,
      "inliner": false
    }
  }
}

