<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".images/logo-dark.png" />
  <img alt="Logo" src=".images/logo-light.png" />
</picture>

---

<div align="center">
    <b>DeFi Protocol concepts, workflows, traces, and source analysis.</b>
</div>

---

### [Visit Protocol Lens](https://nchondromatidis.github.io/protocol-lens/)

### What is it

Protocol Lens is a web app for analyzing defi protocols.

It combines `classic docs` with `dynamic tx analysis in-browser`.

### Protocol Analysis Structure

DeFi protocols are analyzed **per workflow**.

For each workflow, the analysis includes:

- **Whitepaper concepts** with supporting mathematical context
- **Interactive charts** to reinforce core ideas
- **Source code analysis** that connects concepts to implementation
- A **lightweight editor** contaning:
    - **Function Trace**\* for the selected workflow
    - Protocol **source code** view
    - Protocol **file navigation**


<small> * Function traces are only supported in Solidity </small>


### Protocol Analysis Structure Diagram

In the diagram below you can see each workflow's analysis structure

<img src=".images/structure.svg" alt="analysis structure" style="max-width: 100%; width: 400px;">

### About the function tracer (`evm-lens`)

- Protocol is deployed in a test Ethereum node running in-browser using compilation artifacts
- Workflow tx is committed in the test Ethereum node
- Tx opcodes are then decoded to a function trace in-browser using pre-built indexes

### Main Packages

| Package            | Description                                      |
|--------------------|--------------------------------------------------|
| `notes`            | DeFi protocol analysis app (uses evm lens)       |
| `evm-lens-indexer` | Hardhat plugin for building trace indexes        |
| `evm-lens`         | EVM transaction call tracer (browser-native)     |
| `evm-lens-ui`      | React UI components for call trace visualization |

### Architecture

<img src=".images/architecture.svg" alt="analysis structure" style="max-width: 100%; width: 1200px;">
