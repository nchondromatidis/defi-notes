import { HandlerBase } from '../HandlerBase.ts';

import type { InterpreterStep } from 'tevm/evm';
import type { FunctionCallEvent } from '../../CallTrace.ts';
import { CallStack, type PC, type RuntimeTraceMetadata } from '../trace-metadata.ts';
import { safeBigIntToNumber } from '../../../common/utils.ts';

/*
 * Detects internal function calls. <br>
 * Handles JUMPDEST opcode with PC that is a function entry from solidity.output.contracts.evm...functionDebugData. <br>
 * Ignores the first function call that starts the execution context (already decoded by calldata). <br>
 * <b> Detects the program counter for this function to exit </b>
 * <b> No argument fetching or decoding takes place for internal functions </b>
 *
 * <i>
 * context@depth.address --labeledContracts--> contractFQN --debugMetadata.functions--> functionData--> function call
 * </i>
 */
export class FunctionEntryHandler extends HandlerBase {
  public async handle(
    stepEvent: InterpreterStep,
    executionContext: RuntimeTraceMetadata['executionContext'],
    parentFunctionCallEvent: FunctionCallEvent,
    callStack: CallStack
  ): Promise<{ functionCallEvent: FunctionCallEvent; functionExitPc: PC } | undefined> {
    if (stepEvent.opcode.name !== 'JUMPDEST') return undefined;

    // identify contract and function using contract address and pc
    let contractAddress = stepEvent.address.toString();
    const currentDepthExecutionContext = executionContext.get(stepEvent.depth)!;

    if (currentDepthExecutionContext.functionCallEvent.callType === 'DELEGATECALL')
      contractAddress = currentDepthExecutionContext.functionCallEvent.implAddress!;

    const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);
    if (!contractFQN) return undefined;

    const functionIndex = this.debugMetadata.pcLocations.getFunction(contractFQN, 'i', stepEvent.pc);
    if (!functionIndex) return undefined;

    const functionData = callStack.push(functionIndex);
    console.log(functionIndex.name);
    if (!functionData) return undefined;

    const stackTop = stepEvent.stack.length - 1;

    // the first JUMPDEST on a new context must match external call calldata
    if (!executionContext.get(stepEvent.depth)!.isJumpDestReached) {
      const isJumpDestReached =
        functionData.contractFQN === parentFunctionCallEvent.contractFQN &&
        functionData.name == parentFunctionCallEvent.functionName &&
        functionData.kind === parentFunctionCallEvent.functionType;
      if (isJumpDestReached) {
        executionContext.get(stepEvent.depth)!.isJumpDestReached = true;

        const functionExitPc = safeBigIntToNumber(stepEvent.stack[stackTop - functionData.parameterSlots]);
        return { functionCallEvent: parentFunctionCallEvent, functionExitPc };
      }
      return undefined;
    }

    // handle internal calls
    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: stepEvent.address.toString(),
      from: executionContext.get(stepEvent.depth)!.functionCallEvent.from,
      depth: stepEvent.depth,
      rawData: '0x',
      value: 0n,
      callType: 'INTERNAL',
      precompile: false,
      contractFQN,
      functionName: functionData.name,
      functionType: functionData.kind,
      functionLineStart: functionData.functionLineStart,
      functionLineEnd: functionData.functionLineEnd,
      functionSource: functionData.source,
    };
    if (parentFunctionCallEvent.implAddress) {
      functionCallEvent.implContractFQN = parentFunctionCallEvent.implContractFQN;
      functionCallEvent.implAddress = parentFunctionCallEvent.implAddress;
    }
    const functionExitPc = safeBigIntToNumber(stepEvent.stack[stackTop - functionData.parameterSlots]);

    return { functionCallEvent, functionExitPc };
  }
}
