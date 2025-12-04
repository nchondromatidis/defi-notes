import { DebugMetadata } from '../indexes/DebugMetadata.ts';
import { DeploymentTracer } from './DeploymentTracer.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { type Abi, bytesToHex, type Prettify } from 'viem';
import { InvariantError } from '../../common/errors.ts';
import {
  type FunctionCallEvent,
  type FunctionResultEvent,
  LensCallTracerResult,
  type LensLog,
} from './LensCallTracerResult.ts';
import { type Address, type Hex, type LensArtifactsMap, type RawLog } from '../types/artifact.ts';
import { decodeFunctionCallMultipleAbis } from '../decoders/functionCallDecoder.ts';
import {
  DecodedErrorsCache,
  type DecodeFunctionResulData,
  decodeFunctionResultMultipleAbisWithCache,
} from '../decoders/functionResultDecoder.ts';
import {
  type ContractLogDecodingData,
  DecodedLogsCache,
  decodeLogMultipleAbisWithCache,
} from '../decoders/logDecoder.ts';
import { getOrCreate } from '../../common/utils.ts';

type TempTxId = string;
type TxId = Hex;

export class LensCallTracer<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public readonly tracingTxs: Map<string, LensCallTracerResult> = new Map();
  public readonly decodedLogsTxCache: Map<TempTxId, DecodedLogsCache> = new Map();
  public readonly decodedErrorsTxCache: Map<TempTxId, DecodedErrorsCache> = new Map();

  public readonly succeededTxs: Map<TxId, LensCallTracerResult> = new Map();
  public readonly failedTxs: Map<TempTxId, LensCallTracerResult> = new Map();

  constructor(
    private readonly debugMetadata: DebugMetadata,
    private readonly deployedContracts: DeploymentTracer
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
    this.tracingTxs.delete(tempId);
    this.decodedLogsTxCache.delete(tempId);
    this.decodedErrorsTxCache.delete(tempId);
  }

  public stopTracingFailed(txHash: string, tempId: string) {
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.failedTxs.set(txHash, currentTxTrace);
    this.tracingTxs.delete(tempId);
    this.decodedLogsTxCache.delete(tempId);
    this.decodedErrorsTxCache.delete(tempId);
  }

  //** Event Handlers **/

  public async handleFunctionCall(callEvent: Message, tempId: string): Promise<void> {
    const tempIdTxTrace = this.getTracingTx(tempId);

    // base function call object
    const callData = bytesToHex(callEvent.data);
    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: callEvent?.to?.toString(),
      from: callEvent.caller.toString(),
      depth: callEvent.depth,
      rawData: callData,
      value: callEvent.value,
      callType: 'UNKNOWN',
      precompile: callEvent.isCompiled,
    };

    // data needed to decode function call
    let bytecode = undefined;
    const decodingData: Array<{ contractFQN: string | undefined; abi: Abi | undefined }> = [];

    // new contract
    if (!callEvent.to) {
      functionCallEvent.callType = 'CREATE';
      if (callEvent.salt) functionCallEvent.callType = 'CREATE2';
      functionCallEvent.create2Salt = callEvent.salt ? bytesToHex(callEvent.salt) : undefined;
      const result = this.debugMetadata.artifacts.getContractFqnFromCallData(callData);
      bytecode = result.bytecode;
      const newContractFQN = result.newContractFQN;
      functionCallEvent.createdContractFQN = newContractFQN;
      const createdContractAbi = this.debugMetadata.artifacts.getArtifactAbi(newContractFQN);

      decodingData.push({ contractFQN: result.newContractFQN, abi: createdContractAbi });
    }

    // function call
    if (callEvent.to) {
      functionCallEvent.callType = 'CALL';
      if (callEvent.isStatic) functionCallEvent.callType = 'STATICCALL';
      const contractFQN = this.deployedContracts.getContractFqnForAddress(callEvent.to.toString());
      functionCallEvent.contractFQN = contractFQN;
      const { contractAbi, linkLibraries } = this.debugMetadata.artifacts.getAllAbisRelatedTo(contractFQN);
      // called contract
      decodingData.push({ contractFQN, abi: contractAbi });
      // called contract external libraries
      for (const linkLibrary of linkLibraries) {
        decodingData.push({ contractFQN: linkLibrary.fqn, abi: linkLibrary.abi });
      }
    }

    // function delegate call
    if (callEvent.to && callEvent.delegatecall) {
      functionCallEvent.callType = 'DELEGATECALL';
      // callEvent type missing _codeAddress, but implementation has it
      const codeAddress = (callEvent as any)['_codeAddress'].toString() as Address;
      if (!codeAddress) throw new InvariantError('codeAddress is empty', { callEvent, functionCallEvent });

      // delegate call implementation contract
      const implContractFQN = this.deployedContracts.getContractFqnForAddress(codeAddress);
      functionCallEvent.implContractFQN = implContractFQN;
      functionCallEvent.implAddress = codeAddress;

      const implAbi = this.debugMetadata.artifacts.getArtifactAbi(implContractFQN);
      decodingData.push({ contractFQN: implContractFQN, abi: implAbi });
    }

    // decode called function: name, type, args
    const decodedFunctionCall = decodeFunctionCallMultipleAbis({
      decodeData: decodingData,
      rawData: callData,
      precompile: functionCallEvent.precompile,
      value: callEvent.value,
      createdBytecode: bytecode,
    });

    if (decodedFunctionCall) {
      functionCallEvent.functionName = decodedFunctionCall.decodedFunctionName;
      functionCallEvent.functionType = decodedFunctionCall.type;
      functionCallEvent.args = decodedFunctionCall.decodedArgs;

      const sourceLocation = this.debugMetadata.functions.getFunctionCallLocation(
        decodedFunctionCall.contractFQN,
        decodedFunctionCall.decodedFunctionName,
        decodedFunctionCall.type
      );
      functionCallEvent.lineStart = sourceLocation?.lineStart;
      functionCallEvent.lineEnd = sourceLocation?.lineEnd;
      functionCallEvent.source = sourceLocation?.source;
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    // function call that led to this result
    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();

    // base function result object
    const returnValueHex = bytesToHex(resultEvent.execResult.returnValue);
    const functionResultEvent: FunctionResultEvent = {
      type: 'FunctionResultEvent',
      returnValueRaw: returnValueHex,
      isError: !!resultEvent.execResult.exceptionError,
      isCreate: !!resultEvent.createdAddress,
      logs: [],
    };
    if (functionResultEvent.isError) functionResultEvent.errorType = resultEvent.execResult.exceptionError;

    // data needed to decode function result
    const decodeData: Array<Prettify<ContractLogDecodingData & DecodeFunctionResulData>> = [];

    // new contract
    if (functionCallEvent.callType === 'CREATE' || functionCallEvent.callType === 'CREATE2') {
      if (!resultEvent.createdAddress) {
        throw new InvariantError('CREATE/CREATE2 function call without createdAddress');
      }
      functionResultEvent.isCreate = true;
      functionResultEvent.createdAddress = resultEvent.createdAddress.toString();
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;

        const createdContractAbi = this.debugMetadata.artifacts.getArtifactAbi(createdContractFQN);
        decodeData.push({
          contractAddress: functionResultEvent.createdAddress,
          functionName: functionCallEvent.functionName,
          contractFQN: createdContractFQN,
          abi: createdContractAbi,
          contractRole: 'NORMAL',
        });

        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    // call
    if (
      functionCallEvent.to &&
      (functionCallEvent.callType === 'CALL' || functionCallEvent.callType === 'STATICCALL')
    ) {
      const contractFQN = functionCallEvent.contractFQN;
      const contractAbi = this.debugMetadata.artifacts.getArtifactAbi(contractFQN);
      decodeData.push({
        contractAddress: functionCallEvent.to,
        contractFQN: contractFQN,
        functionName: functionCallEvent.functionName,
        abi: contractAbi,
        contractRole: 'NORMAL',
      });
    }

    // delegate call
    if (
      functionCallEvent.to &&
      functionCallEvent.implAddress &&
      functionCallEvent.implContractFQN &&
      functionCallEvent.callType === 'DELEGATECALL'
    ) {
      const contractFQN = functionCallEvent.contractFQN;
      const contractAbi = this.debugMetadata.artifacts.getArtifactAbi(contractFQN);
      decodeData.push({
        contractAddress: functionCallEvent.to,
        contractFQN: contractFQN,
        functionName: functionCallEvent.functionName,
        abi: contractAbi,
        contractRole: 'DELEGATECALL',
      });

      const implContractFQN = functionCallEvent.implContractFQN;
      const implAbi = this.debugMetadata.artifacts.getArtifactAbi(implContractFQN);
      decodeData.push({
        contractAddress: functionCallEvent.implAddress,
        contractFQN: implContractFQN,
        functionName: functionCallEvent.functionName, // todo: fix that
        abi: implAbi,
        contractRole: 'IMPLEMENTATION',
      });
    }

    // decoding result
    const tracingErrorsCache = getOrCreate(this.decodedErrorsTxCache, tempId, () => new DecodedErrorsCache());
    const decodedResult = await decodeFunctionResultMultipleAbisWithCache(
      {
        decodeData: decodeData,
        data: returnValueHex,
        isError: functionResultEvent.isError,
      },
      tracingErrorsCache
    );
    if (decodedResult && !decodedResult.isSuccess) {
      functionResultEvent.errorName = decodedResult.decodedError.errorName;
      functionResultEvent.errorArgs = decodedResult.decodedError.args;
      functionResultEvent.errorAbiItem = decodedResult.decodedError.abiItem;
    }
    if (decodedResult && decodedResult.isSuccess) {
      functionResultEvent.returnValue = decodedResult.decodedFunctionResult;
    }

    // decoding logs
    if (resultEvent.execResult.logs) {
      for (const ethJsLog of resultEvent.execResult.logs) {
        const rawLog = this.convertToRawLog(ethJsLog);
        const tracingLogCache = getOrCreate(this.decodedLogsTxCache, tempId, () => new DecodedLogsCache());
        const decodedLog = await decodeLogMultipleAbisWithCache({ decodeData, log: rawLog }, tracingLogCache);

        const lensLog: LensLog = {
          rawData: rawLog,
          functionName: functionCallEvent.functionName,
          functionType: functionCallEvent.functionType,
          contractFQN: decodedLog?.contractFQN,
          args: decodedLog?.decodedArgs,
          eventName: decodedLog?.decodedEventName,
          eventSignature: decodedLog?.decodedEventSignature,
        };

        functionResultEvent.logs.push(lensLog);
      }
    }

    tempIdTxTrace.addResult(functionResultEvent);
  }

  //** Helper Functions **/

  private getTracingTx(tempId: string) {
    if (!this.tracingTxs.has(tempId)) {
      throw new InvariantError('getTracingTx called without startTxTrace');
    }
    return this.tracingTxs.get(tempId)!;
  }

  private convertToRawLog(log: [address: Uint8Array, topics: Uint8Array[], data: Uint8Array]): RawLog {
    return [bytesToHex(log[0]), log[1].map((it) => bytesToHex(it)), bytesToHex(log[2])];
  }
}
