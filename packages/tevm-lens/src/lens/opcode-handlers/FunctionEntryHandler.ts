import { HandlerBase } from './HandlerBase.ts';

import type { InterpreterStep } from 'tevm/evm';
import { QueryBy } from '../indexes/FunctionIndexesRegistry.ts';
import type { FunctionCallEvent } from '../tx-tracer/TxTrace.ts';
import type { FunctionCallEventHandlers, PC, RuntimeTraceMetadata } from './trace-metadata.ts';

// Handles JUMPDEST opcode with PC that is a function entry (taken from solidity.output.contracts.evm...functionDebugData)
export class FunctionEntryHandler extends HandlerBase {
  public async handle(
    stepEvent: InterpreterStep,
    executionContext: RuntimeTraceMetadata['executionContext'],
    parentFunctionCallEvent: FunctionCallEvent,
    parentFunctionCallEventHandler?: FunctionCallEventHandlers
  ): Promise<{ functionCallEvent?: FunctionCallEvent; pc?: PC }> {
    let contractAddress = stepEvent.address.toString();
    const functionCallExecutionContext = executionContext.get(stepEvent.depth)!;

    if (functionCallExecutionContext.callType === 'DELEGATECALL')
      contractAddress = functionCallExecutionContext.implAddress!;

    const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);
    if (!contractFQN) return { functionCallEvent: undefined, pc: undefined };

    const functionData = this.debugMetadata.functions.getBy(QueryBy.contractFqnAndPC(contractFQN, stepEvent.pc));
    if (!functionData) return { functionCallEvent: undefined, pc: undefined };

    // console.log('---------------------------------------------------------------------');
    // console.log(stepEvent.address.toString(), stepEvent.pc, stepEvent.depth);
    // console.log('functionData', contractFQN, stepEvent.pc, functionData.contractFQN, functionData.nameOrKind);

    if (
      parentFunctionCallEventHandler &&
      parentFunctionCallEventHandler.externalCallHandler &&
      !parentFunctionCallEventHandler.opcodesCallHandler
    ) {
      // already abi registered by external call opcodes, skip adding first
      parentFunctionCallEventHandler.opcodesCallHandler = true;
      const pc = stepEvent.stack[functionData.parameterSlots];
      return { functionCallEvent: undefined, pc };
    }

    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: stepEvent.address.toString(),
      from: parentFunctionCallEvent.from,
      depth: stepEvent.depth,
      rawData: '0x',
      value: 0n,
      callType: 'INTERNAL',
      precompile: false,
      contractFQN,
      functionName: functionData.name,
      functionType: functionData.kind,
      lineStart: functionData.lineStart,
      lineEnd: functionData.lineEnd,
      source: functionData.source,
      implContractFQN: parentFunctionCallEvent.implContractFQN,
      implAddress: parentFunctionCallEvent.implAddress,
    };

    const pc = stepEvent.stack[functionData.parameterSlots];

    return { functionCallEvent, pc };
  }
}
