## Finding Internal Function Entry/Exit PCs from legacyAssembly

### Entry Points

- Iterate through `legacyAssembly[".data"]["0"][".code"]` array
- Track bytecode offset (PC) by summing instruction sizes
- When you find `{ "name": "tag", "value": "X" }`, note the tag number
- Next instruction should be `{ "name": "JUMPDEST" }`
- Record: `tag_X entry PC = current bytecode offset`
- Match tag to function name:
    - Get instruction's `begin`/`end` source positions
    - Find AST function where `begin` falls within function's start/end
    - Check if `visibility === "internal"` or `"private"`

### Exit Points

- Continue iterating the same `.code` array
- Track which function you're currently in (by source positions)
- When you find `{ "name": "JUMP", "jumpType": "[out]" }`:
    - Record: `current_function exit PC = current bytecode offset`
- Multiple exits possible per function (different return paths)

### PC Calculation

- Start at PC = 0
- For each instruction:
    - If `name === "tag"`: size = 0 (not real opcode)
    - If `name === "PUSH"`: size = 1 + (value.length / 2)
    - If `name === "PUSH [tag]"`: size = 3 (becomes PUSH2)
    - If `name === "PUSH [$]"` or `"PUSH #[$]"`: size = 3
    - If `name === "PUSHSIZE"`: size = 2
    - Else: size = 1
    - PC += size

### Result

```javascript
{
  "internalFunction": {
    entryPC: 123,
    exitPCs: [456, 789]  // Multiple exit points possible
  },
  "privateFunction": {
    entryPC: 234,
    exitPCs: [567]
  }
}
```

**legacyAssembly gives MORE information than functionDebugData** for call tree analysis.

## Comparison

### functionDebugData (Solidity 0.8.5+)
```json
{
  "@publicFunction_123": {
    "entryPoint": 45,
    "id": 123,
    "parameterSlots": 1,
    "returnSlots": 1
  }
}
```

**Only provides:**
- ✅ Entry PC
- ✅ Parameter/return slot counts
- ❌ **NO exit PCs**
- ❌ **NO exit types** (return vs revert)

### legacyAssembly
```json
{ "name": "JUMP", "jumpType": "[in]" },   // Entry
{ "name": "JUMP", "jumpType": "[out]" },  // Exit 1
{ "name": "JUMP", "jumpType": "[out]" },  // Exit 2
{ "name": "REVERT" }                      // Exit 3 (error)
```

**Provides:**
- ✅ Entry PCs (tag + JUMPDEST)
- ✅ **All exit PCs** (JUMP [out], RETURN, REVERT)
- ✅ **Multiple exit points** per function
- ✅ **Exit types** (normal return vs error)

## Why legacyAssembly is Better for Call Trees

**Functions can have multiple exit points:**

```solidity
function example(uint x) internal returns (uint) {
    if (x > 10) return x * 2;      // Exit 1
    if (x < 5) revert("too small"); // Exit 2
    return x + 1;                   // Exit 3
}
```

**legacyAssembly shows all 3 exits**

## What functionDebugData is Good For

**parameterSlots/returnSlots** help with:
- Stack analysis
- Argument extraction
- Understanding calling conventions

But for **tracing execution flow**, legacyAssembly is superior.

## Your Best Approach

**Parse legacyAssembly to get:**
- Entry PCs
- All exit PCs per function
- Exit types (return/revert)

**Plus AST to get:**
- Function names
- Parameter types
- Return types

This gives you **more complete information** than functionDebugData alone.

## The Irony

Solidity 0.8.5+ added functionDebugData to make debugging easier...

But legacyAssembly (available in all versions) actually provides **more complete** information for call tree construction!



## Patterns

### Function Entry

```
For each instruction:
- If instruction.name === "tag":
  currentTag = instruction.value

- If instruction.name === "JUMPDEST" AND currentTag exists:
  entryPC = current PC
  astNode = findInAST(instruction.begin, instruction.end, instruction.source)

  if astNode.nodeType === "FunctionDefinition":
  This is a function entry!
  Record: functionName, astId, entryPC

  currentTag = null
```
### Function Exit

```
For each instruction:
  - If JUMP with jumpType "[out]":
      Check AST → which function contains this position?
      Record: functionId, exitPC, type: "internal_return"
  
  - If RETURN:
      Check AST → which function contains this position?
      Record: functionId, exitPC, type: "external_return"
  
  - If REVERT:
      Check AST → which function contains this position?
      Record: functionId, exitPC, type: "revert"
  
  - If STOP:
      Check AST → which function contains this position?
      Record: functionId, exitPC, type: "stop"
```

### Callsite

```
{ "name": "PUSH [tag]", "value": "31" },   // ← This is the target
{ "jumpType": "[in]", "name": "JUMP" }     // Call to tag_31 - callsite
```