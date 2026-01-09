## Concise Summary: Linearization, Super, and Bytecode

When you compile a Solidity contract with multiple inheritance, 
**all parent contract functions are physically copied into a single bytecode** - only one contract is deployed to the blockchain. 
There are no separate contract references or external calls; everything exists as one unified bytecode stream.

### C3 Linearization

**C3 linearization** is the algorithm Solidity uses to determine the exact order in which parent contracts are processed. 
It takes your potentially complex inheritance tree and converts it into a single linear order. 
Solidity uses **reverse C3 linearization** (right-to-left), 
meaning you must list base contracts from "most base-like" to "most derived".

For example, if you write `contract A is B, C, D`, Solidity linearizes starting from D (rightmost), not B.[12]

### How Super Works

When you call `super.ping()`, it doesn't jump to a different contract - it simply follows the **linearized order** 
to determine which function in the copied bytecode to execute next. At the EVM level, 
these resolve to internal **JUMP operations** within the same bytecode. 
The linearization order dictates super's behavior, not the visual inheritance tree or the order you list in `override(B, C)`.

In your contracts, when A calls `super.ping()`, it follows the linearized sequence through B_ED, D, C_FE, F, and E 
- all within A's single deployed bytecode.

