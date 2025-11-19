import { SupportedContracts } from '../../indexes/SupportedContracts.ts';
import { DeployedContracts } from '../../indexes/DeployedContracts.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { type Abi, bytesToHex, decodeEventLog, toEventSignature } from 'viem';
import { InvariantError } from '../../../common/errors.ts';
import {
  type FunctionCallEvent,
  type FunctionResultEvent,
  type LensLog,
  LensCallTracerResult,
} from './LensCallTracerResult.ts';
import type { Hex, LensArtifactsMap } from '../../types/artifact.ts';
import type { AbiEvent } from 'tevm';
import { decodeFunctionCall, decodeFunctionResult } from './decoders.js';

export class LensCallTracer<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public readonly tracedTxs: Map<Hex, LensCallTracerResult<ArtifactMapT>> = new Map();
  public readonly tracingTxs: Map<string, LensCallTracerResult<ArtifactMapT>> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts<ArtifactMapT>,
    private readonly deployedContracts: DeployedContracts<ArtifactMapT>
  ) {}

  //** Start-Stop tracing **/

  public startTracing(tempId: string) {
    const txTrace = new LensCallTracerResult();
    this.tracingTxs.set(tempId, txTrace);
  }

  public stopTracing(txHash: Hex | undefined, tempId: string) {
    if (!txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.tracedTxs.set(txHash, currentTxTrace);
  }

  public deleteTracing(tempId: string) {
    this.tracingTxs.delete(tempId);
  }

  //** Event Handlers **/

  public async handleFunctionCall(callEvent: Message, tempId: string): Promise<void> {
    const tempIdTxTrace = this.getTracingTx(tempId);
    const functionCallEvent: FunctionCallEvent<ArtifactMapT> = { type: 'FunctionCallEvent' };

    functionCallEvent.depth = callEvent.depth;
    const callData = bytesToHex(callEvent.data);

    let bytecode = undefined;
    let contractFQN = undefined;

    if (!callEvent.to) {
      functionCallEvent.isCreate = true;
      ({ bytecode, contractFQN } = this.supportedContracts.getContractFqnFromCallData(callData));
      functionCallEvent.createdContractFQN = contractFQN;
    }
    if (callEvent.to) {
      contractFQN = this.deployedContracts.getContractFqnForAddress(callEvent.to.toString());
      functionCallEvent.contractFQN = contractFQN;
    }

    if (contractFQN) {
      const contractArtifact = this.supportedContracts.getArtifactFrom(contractFQN);
      const decodedFunctionCall = decodeFunctionCall({
        abi: contractArtifact.abi,
        data: callData,
        createdBytecode: bytecode,
      });

      if (decodedFunctionCall) {
        functionCallEvent.functionName = decodedFunctionCall.functionName;
        functionCallEvent.functionType = decodedFunctionCall.type;
        functionCallEvent.constructorArgs = decodedFunctionCall.args;

        const sourceLocation = this.supportedContracts.getFunctionCallLocation(
          contractFQN,
          decodedFunctionCall.functionName,
          decodedFunctionCall.type
        );
        functionCallEvent.lineStart = sourceLocation?.lineStart;
        functionCallEvent.lineEnd = sourceLocation?.lineEnd;
        functionCallEvent.source = sourceLocation?.source;
      }
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    const functionResultEvent: FunctionResultEvent<ArtifactMapT> = {
      type: 'FunctionResultEvent',
    };

    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();
    let contractAbi = undefined;
    if (functionCallEvent.contractFQN) {
      contractAbi = this.supportedContracts.getArtifactPart(functionCallEvent.contractFQN, 'abi');
    }
    const returnValueHex = bytesToHex(resultEvent.execResult.returnValue);
    functionResultEvent.returnValueRaw = returnValueHex;

    // new contract deployment
    if (resultEvent.createdAddress) {
      functionResultEvent.isCreate = true;
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    // function result
    functionResultEvent.isError = false;
    if (!resultEvent.createdAddress && resultEvent.execResult.exceptionError) {
      functionResultEvent.isError = true;
      functionResultEvent.errorType = resultEvent.execResult.exceptionError.error;
    }

    if (contractAbi && functionCallEvent.functionName) {
      const decodedResult = decodeFunctionResult({
        abi: contractAbi,
        data: returnValueHex,
        isError: functionResultEvent.isError,
      });
      if (decodedResult && !decodedResult.isSuccess) {
        functionResultEvent.errorName = decodedResult.error.errorName;
        functionResultEvent.errorArgs = decodedResult.error.args;
        functionResultEvent.errorAbiItem = decodedResult.error.abiItem;
      }
      if (decodedResult && decodedResult.isSuccess) {
        functionResultEvent.returnValue = decodedResult.functionResult;
      }
      // constructor/fallback/receive: do not need decoding
    }

    // logs
    if (contractAbi && resultEvent.execResult.logs) {
      functionResultEvent.logs = resultEvent.execResult.logs.map((log): LensLog => {
        const [signature, ...args] = log[1].map((it) => bytesToHex(it));
        const decodedLog = decodeEventLog({
          abi: contractAbi,
          topics: [signature, ...args],
          data: bytesToHex(log[2]),
        });
        let eventSignature: string | undefined = undefined;
        if (decodedLog.eventName) {
          const abiEvent = this.findEventByName(contractAbi, decodedLog.eventName);
          eventSignature = abiEvent ? toEventSignature(abiEvent) : undefined;
        }
        return {
          eventName: decodedLog.eventName as string,
          args: decodedLog.args as unknown[],
          eventSignature: eventSignature,
        };
      });
    }

    tempIdTxTrace.addResult(functionResultEvent);
  }

  // HELPER FUNCTIONS

  private getTracingTx(tempId: string) {
    if (!this.tracingTxs.has(tempId)) {
      throw new InvariantError('getTracingTx called without startTxTrace');
    }
    return this.tracingTxs.get(tempId)!;
  }

  private findEventByName<A extends Abi>(abi: A, name: string): AbiEvent {
    const ev = abi.find((i): i is AbiEvent => i.type === 'event' && i.name === name);
    if (!ev) throw new Error('Event not found');
    return ev;
  }
}
