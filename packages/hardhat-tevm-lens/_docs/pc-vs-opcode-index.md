## Program Counter (PC)

The PC is a runtime value that tracks the current position in the contract's bytecode during execution. 
It represents the byte offset in the deployed bytecode where the EVM is currently executing. 
The PC increments as the EVM processes each instruction, with the increment size depending on the opcode and 
whether it has immediate operands (push values). 
For example, a PUSH1 opcode takes 2 bytes (1 for the opcode, 1 for the value), so the PC would increment by 2.


## Source Map Opcode Index
The source map opcode index refers to the position within the source map string that corresponds 
to a particular instruction in the bytecode. 
Source maps are metadata generated during compilation that map bytecode positions back to the original Solidity source code. 
Each entry in the source map contains information about the source offset, length, file index, and jump type for debugging purposes.

NOTE: sourcemap NOT track internal function call jumps


## Key Differences
The critical difference is that PC is a dynamic runtime counter tracking execution position in the actual bytecode, 
while the source map index is a static compile-time mapping used for debugging to translate bytecode 
positions back to source code locations. 
The PC changes during contract execution, whereas the source map is fixed metadata created during compilation. 
When debugging, you use the current PC value to look up the corresponding source map entry to determine which line of Solidity code is being executed.