import { HandlerBase } from './HandlerBase.ts';
import type { EvmResult } from 'tevm/evm';
import { bytesToHex } from 'viem';
import type { FunctionCallEvent, FunctionResultEvent, LensLog } from '../tx-tracer/TxTrace.ts';
import {
  type ContractLogDecodingData,
  DecodedLogsCache,
  decodeLogMultipleAbisWithCache,
} from '../abi-decoders/logDecoder.ts';
import {
  DecodedErrorsCache,
  type DecodeFunctionResulData,
  decodeFunctionResultMultipleAbisWithCache,
  decodeFunctionReturnWithFunctionIndex,
} from '../abi-decoders/functionResultDecoder.ts';
import { InvariantError } from '../../common/errors.ts';
import { getOrCreate } from '../../common/utils.ts';
import { QueryBy } from '../indexes/FunctionIndexesRegistry.ts';
import type { RawLog } from '../types/artifact.ts';

type TempTxId = string;

// Handles function results (return, exits, logs, errors) initiated from external calls
// All of these opcodes are abstracted as `EvmResult` object from tevm
export class ExternalCallResultHandler extends HandlerBase {
  public readonly decodedLogsTxCache: Map<TempTxId, DecodedLogsCache> = new Map();
  public readonly decodedErrorsTxCache: Map<TempTxId, DecodedErrorsCache> = new Map();

  async handle(resultEvent: EvmResult, tracingId: string, parentFunctionCallEvent: FunctionCallEvent) {
    // base function result object
    const returnData = bytesToHex(resultEvent.execResult.returnValue);
    const functionResultEvent: FunctionResultEvent = {
      type: 'FunctionResultEvent',
      returnValueRaw: returnData,
      isError: !!resultEvent.execResult.exceptionError,
      isCreate: !!resultEvent.createdAddress,
      logs: [],
    };
    if (functionResultEvent.isError) functionResultEvent.errorType = resultEvent.execResult.exceptionError;

    // data needed to decode function result
    const decodeData: Array<ContractLogDecodingData & DecodeFunctionResulData> = [];

    // new contract
    if (parentFunctionCallEvent.callType === 'CREATE' || parentFunctionCallEvent.callType === 'CREATE2') {
      if (!resultEvent.createdAddress) {
        throw new InvariantError('CREATE/CREATE2 function call without createdAddress');
      }
      functionResultEvent.isCreate = true;
      functionResultEvent.createdAddress = resultEvent.createdAddress.toString();
      const createdContractFQN = parentFunctionCallEvent.createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;

        const createdContractAbi = this.debugMetadata.artifacts.getArtifactAbi(createdContractFQN);
        decodeData.push({
          contractAddress: functionResultEvent.createdAddress,
          functionName: parentFunctionCallEvent.functionName,
          contractFQN: createdContractFQN,
          abi: createdContractAbi,
          contractRole: 'NORMAL',
        });

        this.addressLabeler.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    // call
    if (
      parentFunctionCallEvent.to &&
      (parentFunctionCallEvent.callType === 'CALL' || parentFunctionCallEvent.callType === 'STATICCALL')
    ) {
      const contractFQN = parentFunctionCallEvent.contractFQN;
      const contractAbi = this.debugMetadata.artifacts.getArtifactAbi(contractFQN);
      decodeData.push({
        contractAddress: parentFunctionCallEvent.to,
        contractFQN: contractFQN,
        functionName: parentFunctionCallEvent.functionName,
        abi: contractAbi,
        contractRole: 'NORMAL',
      });
    }

    // delegate call
    if (
      parentFunctionCallEvent.to &&
      parentFunctionCallEvent.implAddress &&
      parentFunctionCallEvent.implContractFQN &&
      parentFunctionCallEvent.callType === 'DELEGATECALL'
    ) {
      const contractFQN = parentFunctionCallEvent.contractFQN;
      const contractAbi = this.debugMetadata.artifacts.getArtifactAbi(contractFQN);
      decodeData.push({
        contractAddress: parentFunctionCallEvent.to,
        contractFQN: contractFQN,
        functionName: parentFunctionCallEvent.functionName,
        abi: contractAbi,
        contractRole: 'DELEGATECALL',
      });

      const implContractFQN = parentFunctionCallEvent.implContractFQN;
      const implAbi = this.debugMetadata.artifacts.getArtifactAbi(implContractFQN);
      decodeData.push({
        contractAddress: parentFunctionCallEvent.implAddress,
        contractFQN: implContractFQN,
        functionName: parentFunctionCallEvent.functionName,
        abi: implAbi,
        contractRole: 'IMPLEMENTATION',
      });
    }

    // decoding result
    const tracingErrorsCache = getOrCreate(this.decodedErrorsTxCache, tracingId, () => new DecodedErrorsCache());
    const decodedResult = await decodeFunctionResultMultipleAbisWithCache(
      {
        decodeData: decodeData,
        data: returnData,
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

    // External function call, selector not matching any ABI
    if (!decodedResult) {
      if (parentFunctionCallEvent.contractFQN && parentFunctionCallEvent.functionName && parentFunctionCallEvent.type) {
        const contractFQN = parentFunctionCallEvent.implContractFQN ?? parentFunctionCallEvent.contractFQN;
        const functionIndex = this.debugMetadata.functions.getBy(
          QueryBy.contractAndNameOrKind(contractFQN, parentFunctionCallEvent.functionName, parentFunctionCallEvent.type)
        );

        functionResultEvent.returnValue = decodeFunctionReturnWithFunctionIndex({ returnData, functionIndex });
      }
    }

    // decoding logs
    if (resultEvent.execResult.logs) {
      for (const ethJsLog of resultEvent.execResult.logs) {
        const rawLog = this.convertToRawLog(ethJsLog);
        const tracingLogCache = getOrCreate(this.decodedLogsTxCache, tracingId, () => new DecodedLogsCache());
        const decodedLog = await decodeLogMultipleAbisWithCache({ decodeData, log: rawLog }, tracingLogCache);

        const lensLog: LensLog = {
          rawData: rawLog,
          functionName: parentFunctionCallEvent.functionName,
          functionType: parentFunctionCallEvent.functionType,
          contractFQN: decodedLog?.contractFQN,
          args: decodedLog?.decodedArgs,
          eventName: decodedLog?.decodedEventName,
          eventSignature: decodedLog?.decodedEventSignature,
        };

        functionResultEvent.logs.push(lensLog);
      }
    }

    return functionResultEvent;
  }

  public cleanCache(tempId: TempTxId) {
    this.decodedLogsTxCache.delete(tempId);
    this.decodedErrorsTxCache.delete(tempId);
  }

  private convertToRawLog(log: [address: Uint8Array, topics: Uint8Array[], data: Uint8Array]): RawLog {
    return [bytesToHex(log[0]), log[1].map((it) => bytesToHex(it)), bytesToHex(log[2])];
  }
}
