import { HandlerBase } from '../HandlerBase.ts';
import type { FunctionCallEvent } from '../../CallTrace.ts';
import { type RuntimeTraceMetadata } from '../trace-metadata.ts';
import type { InternalFunctionCallEvent } from '../_events/call-trace-events.ts';

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
    internalCallEvent: InternalFunctionCallEvent,
    executionContext: RuntimeTraceMetadata['executionContext'],
    parentFunctionCallEvent: FunctionCallEvent
  ): Promise<FunctionCallEvent | undefined> {
    // identify contract and function using contract address and pc
    let contractAddress = internalCallEvent.opcodeStepEvent.to;
    const currentDepthExecutionContext = executionContext.get(internalCallEvent.opcodeStepEvent.depth)!;
    const depth = internalCallEvent.opcodeStepEvent.depth;

    if (currentDepthExecutionContext.functionCallEvent.callType === 'DELEGATECALL')
      contractAddress = currentDepthExecutionContext.functionCallEvent.implAddress!;

    const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);
    if (!contractFQN) return undefined;

    const functionIndex = this.debugMetadata.pcLocations.getFunctionIndex(
      contractFQN,
      internalCallEvent.opcodeStepEvent.pc
    );
    if (!functionIndex) return undefined;

    const functionData = functionIndex;
    if (!functionData) return undefined;

    // the first JUMPDEST on a new context must match external call calldata
    if (!executionContext.get(depth)!.isJumpDestReached) {
      const isJumpDestReached =
        functionData.contractFQN === parentFunctionCallEvent.contractFQN &&
        functionData.name == parentFunctionCallEvent.functionName &&
        functionData.kind === parentFunctionCallEvent.functionType;
      if (isJumpDestReached) {
        executionContext.get(depth)!.isJumpDestReached = true;

        return parentFunctionCallEvent;
      }
      return undefined;
    }

    // handle internal calls
    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: internalCallEvent.opcodeStepEvent.to,
      from: executionContext.get(depth)!.functionCallEvent.from,
      depth,
      rawData: '',
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

    return functionCallEvent;
  }
}
