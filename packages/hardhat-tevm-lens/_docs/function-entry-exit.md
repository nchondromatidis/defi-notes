### Quick Extraction Method

#### Step 1: Get parameterSlots and returnSlots from artifact

text
artifact.evm.deployedBytecode.functionDebugData["@functionName"]


#### Step 2: At function entry (JUMPDEST):

Read stack[parameterSlots] down to stack[1] for arguments

In order: deepest = 1st arg, top = last arg

#### Step 3: At function return (before final JUMP):

Read stack[returnSlots-1] down to stack[0] for returns

In order: top = last return, below = earlier returns

#### Step 4: If return is < 0x200:

Treat as memory pointer

Read memory at pointer: first 32 bytes = length

Elements follow at pointer+0x20, pointer+0x40, etc.

Reference types are passed as memory offsets or storage slot numbers, not the actual data.
The function body then uses these offsets to access or modify the referenced data in memory or storage.


Summary
- Solidity calling convention is deterministic: parameterSlots and returnSlots in artifact tell you exactly what to expect
- No encoding overhead: Internal calls skip ABI encoding, values are raw on stack


```
// FUNCTION ENTRY INIT
PC 0x50:  PUSH 0x70          Stack: [0x70, ...] Return address 0x70
PC 0x52:  PUSH 1000          Stack: [1000, 0x70, ...] Argument
PC 0x54:  PUSH 0x20          Stack: [0x20, 1000, 0x70, ...] Entry point
PC 0x56:  JUMP               Stack: [1000, 0x70, ...] (Pops 0x20, jumps to PC 0x20)
...
// FUNCTION ENTRY
PC 0x20:  JUMPDEST           Stack: [1000, 0x70, ...] Entry point, Depth 0: arg (1000), Depth 1: return addr (0x70) 
// FUNCTION BODY
PC 0x21:  PUSH 50            Stack: [50, 1000, 0x70, ...]
PC 0x23:  ADD                Stack: [1050, 0x70, ...]
PC 0x24:  PUSH 100           Stack: [100, 1050, 0x70, ...]
PC 0x26:  SUB                Stack: [950, 0x70, ...]
// FUNCTION RETURN
PC 0x27:  JUMP               Stack: [950, ...] No preceding PUSH, pops return addr 0x70, jumps to 0x70
...
PC 0x70:  Resume             Stack: [950, ...] Return value 950 first in stack for caller to process
```