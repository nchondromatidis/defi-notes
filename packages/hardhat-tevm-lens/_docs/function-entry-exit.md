### Canonical non-inlined internal-call pattern
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


### Detection Algorithm

Based on your constraints (optimizer/IR enabled, no CFG, dynamic trace available), here's the minimal heuristic to detect internal call patterns:

## Minimal Internal Call Detection Algorithm

**At each opcode step during trace:**

1. **Check for `JUMP` with `j=i` marker**
    - If current instruction is `JUMP` AND sourcemap entry has `j=i`, proceed
    - Read `targetPC = stack[0]` (jump destination)

2. **Validate it's a real call**
    - Verify next executed instruction at `targetPC` is `JUMPDEST`
    - Check `stack[1]` contains a valid return address (must be a `JUMPDEST` location in bytecode)

3. **Extract arguments**
    - Read `returnAddr = stack[1]`
    - For N-argument function: `args[0..N-1] = stack[2..N+1]`
    - (Get N from AST/ABI after resolving sourcemap `s:l` range to function name)

4. **Confirm on exit**
    - Later, when you see `JUMP` with `j=o` AND `stack[0] == returnAddr`, that's the matching return
    - If no matching return occurs, discard the candidate (was likely optimizer artifact/false positive)

**That's it.** Three runtime checks (sourcemap `j=i`, JUMPDEST validation, return address confirmation) plus stack slicing.

## Key insight
You don't need to find "the function entry JUMPDEST"—just observe the **callsite jump** where args are still on the stack, then validate the round-trip via the return address.[5][3]
