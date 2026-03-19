import type { FunctionTraceCall } from '../../4_function-trace/FunctionTraceBuilder.ts';
import type { InternalFunctionCallEvent } from '../function-call-events.ts';
import type { PcLocationIndexesRegistry } from '../../../indexes/PcLocationIndexesRegistry.ts';
import type { AddressLabeler } from '../../../indexes/AddressLabeler.ts';

export class FunctionEntryDecoder {
  public readonly name = 'FunctionEntryTransform';

  constructor(
    private pcLocationIndexes: PcLocationIndexesRegistry,
    private addressLabeler: AddressLabeler
  ) {}

  decode(
    internalCallEvent: InternalFunctionCallEvent,
    isJumpDestReached: boolean,
    parentFunctionCallEvent: FunctionTraceCall
  ): FunctionTraceCall | undefined {
    // Identify contract and function using contract address and pc
    let contractAddress = internalCallEvent.opcodeStepEvent.to;
    const depth = internalCallEvent.opcodeStepEvent.depth;

    let parentFunctionContractFQN = parentFunctionCallEvent.contractFQN;

    // Handle DELEGATECALL context
    if (parentFunctionCallEvent.callType === 'DELEGATECALL') {
      contractAddress = parentFunctionCallEvent.implAddress!;
      parentFunctionContractFQN = parentFunctionCallEvent.implContractFQN!;
    }

    const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);
    if (!contractFQN || !parentFunctionContractFQN) return undefined;

    const functionIndex = this.pcLocationIndexes.getFunctionIndex(contractFQN, internalCallEvent.opcodeStepEvent.pc);
    if (!functionIndex) return undefined;

    // The first internal function call on a new context may accidentally match the external call calldata
    if (!isJumpDestReached) {
      const isFirstCallMatch =
        contractFQN === parentFunctionContractFQN &&
        functionIndex.name === parentFunctionCallEvent.functionName &&
        functionIndex.kind === parentFunctionCallEvent.functionType;

      if (isFirstCallMatch) return parentFunctionCallEvent;
    }

    const functionCallEvent: FunctionTraceCall = {
      type: 'FunctionCallEvent',
      to: internalCallEvent.opcodeStepEvent.to,
      from: parentFunctionCallEvent.from,
      depth,
      rawData: '0x',
      value: 0n,
      callType: 'INTERNAL',
      precompile: false,
      contractFQN,
      functionName: functionIndex.name,
      functionType: functionIndex.kind,
      functionLineStart: functionIndex.functionLineStart,
      functionLineEnd: functionIndex.functionLineEnd,
      functionSource: functionIndex.source,
    };

    // Inherit proxy context if the parent was a DELEGATECALL
    if (parentFunctionCallEvent.implAddress) {
      functionCallEvent.implContractFQN = parentFunctionCallEvent.implContractFQN;
      functionCallEvent.implAddress = parentFunctionCallEvent.implAddress;
    }

    return functionCallEvent;
  }

  reset(): void {
    // No state to reset
  }
}
