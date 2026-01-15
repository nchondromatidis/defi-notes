import { HandlerBase } from '../HandlerBase.ts';
import type { InterpreterStep } from 'tevm/evm';
import { isExternalCallOpcode, isJumpDestOpcode, isJumpOpcode } from '../../opcodes';
import type { RuntimeTraceMetadata } from '../trace-metadata.ts';
import { debugLog } from './debug.ts';

export class FunctionCallMatcher extends HandlerBase {
  private opcodesPerDepth: Map<number, InterpreterStep[]> = new Map();
  private previousDepth = 0;
  private opcodeSequenceNumber = 0;

  public async _handle(stepEvent: InterpreterStep) {
    this.opcodeSequenceNumber++;
    if (stepEvent.depth < this.previousDepth) {
      // build tree
      this.opcodesPerDepth.delete(stepEvent.depth);
    } else {
      if (!this.opcodesPerDepth.has(stepEvent.depth)) this.opcodesPerDepth.set(stepEvent.depth, []);
      this.opcodesPerDepth.get(stepEvent.depth)!.push(stepEvent);
    }

    this.previousDepth = stepEvent.depth;
  }

  public async handle(stepEvent: InterpreterStep, executionContext: RuntimeTraceMetadata['executionContext']) {
    this.opcodeSequenceNumber++;
    // identify contract and function using contract address and pc
    let contractAddress = stepEvent.address.toString();
    const currentDepthExecutionContext = executionContext.get(stepEvent.depth)!;

    if (currentDepthExecutionContext.functionCallEvent.callType === 'DELEGATECALL')
      contractAddress = currentDepthExecutionContext.functionCallEvent.implAddress!;

    const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);
    if (!contractFQN) return undefined;

    const contactName = contractFQN.split(':')[1];

    if (isJumpOpcode(stepEvent.opcode.name)) {
      // get function
      const functionIn = this.debugMetadata.pcLocations.getFunction(contractFQN, 'i', stepEvent.pc);
      const functionOut = this.debugMetadata.pcLocations.getFunction(contractFQN, 'o', stepEvent.pc);

      debugLog(contactName, stepEvent, 'i', this.opcodeSequenceNumber, functionIn);
      debugLog(contactName, stepEvent, 'o', this.opcodeSequenceNumber, functionOut);
    }
    if (isJumpDestOpcode(stepEvent.opcode.name) || isExternalCallOpcode(stepEvent.opcode.name)) {
      const functionDest = this.debugMetadata.pcLocations.getFunction(contractFQN, '-', stepEvent.pc);
      debugLog(contactName, stepEvent, '-', this.opcodeSequenceNumber, functionDest);
    }
  }

  public clean() {
    this.opcodesPerDepth = new Map();
    this.opcodeSequenceNumber = 0;
    this.previousDepth = 0;
  }
}
