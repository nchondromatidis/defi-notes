# Find the line the function call took place
### Opcode pattern

```
        Address             Opcode      Stack
        
        PUSHX_ADDRESS       PUSHX       [..., JUMPDEST_ADDRESS, ...]
                            ...
                            ...
        JUMP_ADDRESS        JUMP/I      [...., JUMPDEST_ADDRESS]
                            ...
                            ...
PC ->   JUMPDEST_ADDRESS    JUMPDEST    [....]
```
### Find call function source
- We know the JUMPDEST_ADDRESS from compiler.output.evm.deployedByteocode.functionDebugData
- We look back to find the JUMP/I opcode that contains JUMPDEST_ADDRESS in stack
- We get look back to find the first PUSHX opcode that contains JUMPDEST_ADDRESS in stack
- We find the source code line that corresponds to the PUSHX opcode