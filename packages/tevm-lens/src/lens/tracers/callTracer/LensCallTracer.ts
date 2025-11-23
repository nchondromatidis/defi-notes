import { SupportedContracts } from '../../indexes/SupportedContracts.ts';
import { DeployedContracts } from '../../indexes/DeployedContracts.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { bytesToHex } from 'viem';
import { InvariantError } from '../../../common/errors.ts';
import { type FunctionCallEvent, type FunctionResultEvent, LensCallTracerResult } from './LensCallTracerResult.ts';
import { type Address, type Hex, type LensArtifactsMap } from '../../types/artifact.ts';
import { decodeFunctionCall, decodeFunctionResult, decodeLog } from './decoders.ts';

export class LensCallTracer<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public readonly tracingTxs: Map<string, LensCallTracerResult> = new Map();

  public readonly succeededTxs: Map<Hex, LensCallTracerResult> = new Map();
  public readonly failedTxs: Map<string, LensCallTracerResult> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts,
    private readonly deployedContracts: DeployedContracts
  ) {}

  //** Start-Stop tracing **/

  public startTracing(tempId: string) {
    const txTrace = new LensCallTracerResult();
    this.tracingTxs.set(tempId, txTrace);
  }

  public stopTracingSuccess(txHash: Hex | undefined, tempId: string) {
    if (!txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.succeededTxs.set(txHash, currentTxTrace);
  }

  public stopTracingFailed(txHash: string, tempId: string) {
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.failedTxs.set(txHash, currentTxTrace);
  }

  //** Event Handlers **/

  public async handleFunctionCall(callEvent: Message, tempId: string): Promise<void> {
    const tempIdTxTrace = this.getTracingTx(tempId);

    // function call object
    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: callEvent?.to?.toString(),
    };
    functionCallEvent.isDelegateCall = callEvent.delegatecall;
    functionCallEvent.depth = callEvent.depth;
    functionCallEvent.value = callEvent.value;
    functionCallEvent.data = bytesToHex(callEvent.data);

    const callData = bytesToHex(callEvent.data);

    let bytecode = undefined;
    let contractFQN = undefined;

    if (!callEvent.to) {
      functionCallEvent.isCreate = true;
      functionCallEvent.create2Salt = callEvent.salt ? bytesToHex(callEvent.salt) : undefined;
      ({ bytecode, contractFQN } = this.supportedContracts.getContractFqnFromCallData(callData));
      functionCallEvent.createdContractFQN = contractFQN;
    }

    if (callEvent.to) {
      contractFQN = this.deployedContracts.getContractFqnForAddress(callEvent.to.toString());
      functionCallEvent.contractFQN = contractFQN;
    }

    if (callEvent.to && callEvent.delegatecall) {
      functionCallEvent.proxyContractFQN = functionCallEvent.contractFQN;
      functionCallEvent.proxyAddress = callEvent.to.toString();

      // callEvent type missing _codeAddress
      const codeAddress = (callEvent as any)['_codeAddress'].toString()! as Address;
      contractFQN = this.deployedContracts.getContractFqnForAddress(codeAddress);
      functionCallEvent.contractFQN = contractFQN;
      functionCallEvent.to = codeAddress;
    }

    if (contractFQN) {
      const contractAbi = this.supportedContracts.getArtifactPart(contractFQN, 'abi');
      if (contractAbi) {
        const decodedFunctionCall = decodeFunctionCall({
          abi: contractAbi,
          data: callData,
          createdBytecode: bytecode,
          value: callEvent.value,
        });

        if (decodedFunctionCall) {
          functionCallEvent.functionName = decodedFunctionCall.decodedFunctionName;
          functionCallEvent.functionType = decodedFunctionCall.type;
          functionCallEvent.args = decodedFunctionCall.decodedArgs;

          const sourceLocation = this.supportedContracts.getFunctionCallLocation(
            contractFQN,
            decodedFunctionCall.decodedFunctionName,
            decodedFunctionCall.type
          );
          functionCallEvent.lineStart = sourceLocation?.lineStart;
          functionCallEvent.lineEnd = sourceLocation?.lineEnd;
          functionCallEvent.source = sourceLocation?.source;
        }
      }
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    // function call that led to this result
    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();
    const contractFQN = functionCallEvent.contractFQN;
    const functionName = functionCallEvent.functionName;

    // function result object
    const functionResultEvent: FunctionResultEvent = {
      type: 'FunctionResultEvent',
    };
    const returnValueHex = bytesToHex(resultEvent.execResult.returnValue);
    functionResultEvent.returnValueRaw = returnValueHex;

    // case: new contract deployment
    if (resultEvent.createdAddress) {
      functionResultEvent.isCreate = true;
      functionResultEvent.createdAddress = resultEvent.createdAddress.toString();
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    // case: function result
    let abi = undefined;
    if (contractFQN) abi = this.supportedContracts.getArtifactPart(contractFQN, 'abi');

    functionResultEvent.isError = false;
    if (!resultEvent.createdAddress && resultEvent.execResult.exceptionError) {
      functionResultEvent.isError = true;
      functionResultEvent.rawError = resultEvent.execResult.exceptionError;
    }

    if (abi && functionName) {
      const decodedResult = decodeFunctionResult({
        abi: abi,
        data: returnValueHex,
        isError: functionResultEvent.isError,
      });
      if (decodedResult && !decodedResult.isSuccess) {
        functionResultEvent.errorName = decodedResult.decodedError.errorName;
        functionResultEvent.errorArgs = decodedResult.decodedError.args;
        functionResultEvent.errorAbiItem = decodedResult.decodedError.abiItem;
      }
      if (decodedResult && decodedResult.isSuccess) {
        functionResultEvent.returnValue = decodedResult.decodedFunctionResult;
      }
    }

    // case: constructor/fallback/receive: do not need decoding

    // logs
    if (abi && resultEvent.execResult.logs) {
      const logAbis = resultEvent.execResult.logs.map((it) => {
        const logContractAddress = bytesToHex(it[0]);

        const logAbiContractAddress = functionCallEvent.isDelegateCall ? functionCallEvent.to : logContractAddress;
        if (!logAbiContractAddress) return undefined;

        const logContractFQN = this.deployedContracts.getContractFqnForAddress(logAbiContractAddress);
        if (!logContractFQN) return;
        const logContractAbi = this.supportedContracts.getArtifactPart(logContractFQN, 'abi');

        return { log: it, logContractAbi, logContractFQN };
      });
      functionResultEvent.logs = logAbis
        .map((it) => {
          if (!it) return undefined;
          const decoded = decodeLog(it.log, it.logContractAbi);
          return {
            ...decoded,
            contractFQN: it.logContractFQN,
          };
        })
        .filter((it) => it !== undefined);
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
}
