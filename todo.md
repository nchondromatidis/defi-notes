# TODO

- temv-lens
  - Features
    - Next milestones:
      - FunctionEntryHandler
        - Decode arguments
      - FunctionExitHandler
        - Decode result
        - Decode Events
        - Decode Errors
      - Indexer: 
        - detect/decode public variables getters
        - use solc instead of hardhat to be able to be used directly in browser
      - add logger
      - Register call and result line numbers
      - Inline libs detection
      - Precompile detection
      - Minify json indexes for prod vs dev
    - Refactor
      - break decoding function call: function call, fallback handlers
      - break decoding result: error, result
      - convert anemic to a rich domain model
      - Replace tevm objects for external calls and results with raw data (opcodes, stack, memory)
      - Rethink ArtifactMap generics
- tevm-lens-ui
    - txTrace -> components
- analysis
    - Add dependency on protocols
    - while using analysis: fix tevm-lens when needed


# Thoughts
- Runtime trace metadata class
- Trace result class
- Make the system more error-resilient
  - currently it expects function entries and returns to be detected and in a specific order
  - Detect and take action (eg skip current execution context), empty vs wrong:
    - what if you expect a function1 call, but you get a function2 call?
    - what if you expect a function1 result, but you get a function2 result?


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

