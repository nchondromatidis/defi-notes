import { SupportedContracts } from './SupportedContracts.ts';
import { DeployedContracts } from './DeployedContracts.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { type Abi, bytesToHex, decodeEventLog, decodeFunctionData, toEventSignature, toHex } from 'viem';
import { InvariantError } from '../common/errors.ts';
import { type FunctionCallEvent, type FunctionResultEvent, type LensLog, TxTrace } from './TxTrace.ts';
import type { Hex, LensArtifactsMap } from './artifact.ts';
import type { AbiEvent } from 'tevm';

export class Tracer<TMap extends LensArtifactsMap<TMap>> {
  public readonly tracedTx: Map<Hex, TxTrace<TMap>> = new Map();
  public readonly tracingTx: Map<string, TxTrace<TMap>> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts<TMap>,
    private readonly deployedContracts: DeployedContracts<TMap>
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
    const functionCallEvent: FunctionCallEvent<TMap> = { type: 'FunctionCallEvent' };

    // new contract deployment
    if (!callEvent.to) {
      functionCallEvent.isCreate = true;
      const hexBytecode = bytesToHex(callEvent.data);
      const contractFQN = await this.supportedContracts.getContractFqnFromBytecode(hexBytecode);
      if (contractFQN) {
        functionCallEvent.createdContractFQN = contractFQN;
        const contractArtifact = await this.supportedContracts.getArtifactFrom(contractFQN);
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
      const contractFQN = this.deployedContracts.getContractForAddress(callEvent.to.toString());
      if (contractFQN) {
        const contractArtifact = await this.supportedContracts.getArtifactFrom(contractFQN);
        const decoded = decodeFunctionData({
          abi: contractArtifact.abi,
          data: toHex(callEvent.data),
        });
        functionCallEvent.contractFQN = contractFQN;
        functionCallEvent.functionName = decoded.functionName;
        functionCallEvent.args = decoded.args ?? [];
      }
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    const functionResultEvent: FunctionResultEvent<TMap> = { type: 'FunctionResultEvent' };

    // new contract deployment
    if (resultEvent.createdAddress) {
      functionResultEvent.isCreate = true;
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    const contractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().contractFQN;
    let contractAbi = undefined;
    if (contractFQN) {
      contractAbi = await this.supportedContracts.getArtifactPart(contractFQN, 'abi');
    }

    // function result with error
    if (!resultEvent.createdAddress && resultEvent.execResult.exceptionError) {
      // decode logs
    }

    // function result without error
    if (!resultEvent.createdAddress && !resultEvent.execResult.exceptionError) {
      // TODO: continue here
      // decodeFunctionResult({
      //   abi: yourContractAbi,
      //   functionName: 'balanceOf',
      //   data: '0x000000000000000000000000000000000000000000000000000000000000002a', // raw return data
      // });
      // success
    }

    // logs
    if (contractAbi && resultEvent.execResult.logs) {
      const lensLogs: LensLog[] = resultEvent.execResult.logs.map((log) => {
        const [signature, ...args] = log[1].map((it) => bytesToHex(it));
        const decodedLog = decodeEventLog({
          abi: contractAbi,
          topics: [signature, ...args],
          data: bytesToHex(log[2]),
        });
        // TODO: fix this type error
        const abiEvent = this.findEventByName(contractAbi, decodedLog.eventName);
        const eventSignature = abiEvent ? toEventSignature(abiEvent) : undefined;
        return { ...decodedLog, eventSignature: eventSignature };
      });
      functionResultEvent.logs = lensLogs;
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
