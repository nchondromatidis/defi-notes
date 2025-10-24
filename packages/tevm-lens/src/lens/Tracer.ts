import { SupportedContracts } from './SupportedContracts.ts';
import { DeployedContracts } from './DeployedContracts.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import {
  type Abi,
  bytesToHex,
  decodeErrorResult,
  decodeEventLog,
  decodeFunctionData,
  decodeFunctionResult,
  toEventSignature,
  toHex,
} from 'viem';
import { InvariantError } from '../common/errors.ts';
import { type FunctionCallEvent, type FunctionResultEvent, type LensLog, TxTrace } from './TxTrace.ts';
import type { Hex, LensArtifactsMap } from './artifact.ts';
import type { AbiEvent } from 'tevm';

export class Tracer<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public readonly tracedTx: Map<Hex, TxTrace<ArtifactMapT>> = new Map();
  public readonly tracingTx: Map<string, TxTrace<ArtifactMapT>> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts<ArtifactMapT>,
    private readonly deployedContracts: DeployedContracts<ArtifactMapT>
  ) {}

  //** Start-Stop tx-tracing **/

  public startTxTrace(tempId: string) {
    const txTrace = new TxTrace();
    this.tracingTx.set(tempId, txTrace);
  }

  public stopTxTrace(txHash: Hex | undefined, tempId: string) {
    if (!txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracingTx.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.tracedTx.set(txHash, currentTxTrace);
  }

  //** Event Handlers **/

  public async handleFunctionCall(callEvent: Message, tempId: string): Promise<void> {
    const tempIdTxTrace = this.getTracingTx(tempId);
    const functionCallEvent: FunctionCallEvent<ArtifactMapT> = { type: 'FunctionCallEvent' };

    functionCallEvent.depth = callEvent.depth;

    // new contract deployment
    if (!callEvent.to) {
      functionCallEvent.isCreate = true;
      const hexBytecode = bytesToHex(callEvent.data);
      const contractFQN = this.supportedContracts.getContractFqnFromBytecode(hexBytecode);
      if (contractFQN) {
        functionCallEvent.createdContractFQN = contractFQN;
        const contractArtifact = this.supportedContracts.getArtifactFrom(contractFQN);
        const constructorCode = contractArtifact.bytecode.slice(hexBytecode.length) as Hex;
        if (constructorCode.length === 0) {
          functionCallEvent.constructorArgs = [];
        } else {
          const decodedNew = decodeFunctionData({
            abi: contractArtifact.abi,
            data: constructorCode,
          });
          functionCallEvent.constructorArgs = decodedNew.args;
        }
      }
    }

    // function call/send
    if (callEvent.to) {
      const contractFQN = this.deployedContracts.getContractFqnForAddress(callEvent.to.toString());
      if (contractFQN) {
        const contractArtifact = this.supportedContracts.getArtifactFrom(contractFQN);
        const decoded = decodeFunctionData({
          abi: contractArtifact.abi,
          data: toHex(callEvent.data),
        });
        const sourceLocation = this.supportedContracts.getFunctionLocation(contractFQN, decoded.functionName);
        functionCallEvent.contractFQN = contractFQN;
        functionCallEvent.functionName = decoded.functionName;
        functionCallEvent.args = decoded.args ?? [];
        functionCallEvent.lineStart = sourceLocation?.lineStart;
        functionCallEvent.lineEnd = sourceLocation?.lineEnd;
        functionCallEvent.source = sourceLocation?.source;
      }
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    const functionResultEvent: FunctionResultEvent<ArtifactMapT> = { type: 'FunctionResultEvent' };

    // new contract deployment
    if (resultEvent.createdAddress) {
      functionResultEvent.isCreate = true;
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();
    let contractAbi = undefined;
    if (functionCallEvent.contractFQN) {
      contractAbi = this.supportedContracts.getArtifactPart(functionCallEvent.contractFQN, 'abi');
    }
    const returnValueHex = bytesToHex(resultEvent.execResult.returnValue);

    // function result without error
    if (!resultEvent.createdAddress && !resultEvent.execResult.exceptionError) {
      functionResultEvent.returnValueRaw = returnValueHex;
      if (contractAbi && functionCallEvent.functionName) {
        functionResultEvent.returnValue = decodeFunctionResult({
          abi: contractAbi as Abi,
          functionName: functionCallEvent.functionName,
          data: returnValueHex,
        });
      }
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

    // function result with error
    if (!resultEvent.createdAddress && resultEvent.execResult.exceptionError) {
      functionResultEvent.isError = true;
      functionResultEvent.errorType = resultEvent.execResult.exceptionError.error;
      functionResultEvent.returnValueRaw = returnValueHex;
      if (contractAbi && functionCallEvent.functionName) {
        const decodedError = decodeErrorResult({
          abi: contractAbi,
          data: returnValueHex,
        });
        functionResultEvent.errorName = decodedError.errorName;
        functionResultEvent.errorArgs = decodedError.args;
        functionResultEvent.errorAbiItem = decodedError.abiItem;
      }
    }

    tempIdTxTrace.addResult(functionResultEvent);
  }

  private getTracingTx(tempId: string) {
    if (!this.tracingTx.has(tempId)) {
      throw new InvariantError('getTracingTx called without startTxTrace');
    }
    return this.tracingTx.get(tempId)!;
  }

  findEventByName<A extends Abi>(abi: A, name: string): AbiEvent {
    const ev = abi.find((i): i is AbiEvent => i.type === 'event' && i.name === name);
    if (!ev) throw new Error('Event not found');
    return ev;
  }
}
