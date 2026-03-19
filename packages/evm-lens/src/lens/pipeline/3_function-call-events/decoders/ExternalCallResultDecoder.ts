import type { ExternalCallResultEvmEvent } from '../../2_evm-events/evm-events.ts';
import type { FunctionTraceCall, FunctionTraceResult, LensLog } from '../../4_function-trace/FunctionTraceBuilder.ts';
import { bytesToHex } from 'viem';
import type { Abi } from 'viem';
import type { RawLog } from '../../../types.ts';
import type { Address } from '../../../types.ts';
import type { ArtifactsProvider } from '../../../indexes/ArtifactsProvider.ts';
import type { AddressLabeler } from '../../../indexes/AddressLabeler.ts';
import type { FunctionIndexesRegistry } from '../../../indexes/FunctionIndexesRegistry.ts';
import { QueryBy } from '../../../indexes/FunctionIndexesRegistry.ts';
import {
  DecodedLogsCache,
  decodeLogMultipleAbisWithCache,
  type ContractLogDecodingData as LogContractLogDecodingData,
} from '../../../abi-decoders/logDecoder.ts';
import {
  DecodedErrorsCache,
  decodeFunctionResultMultipleAbisWithCache,
  decodeFunctionReturnWithFunctionIndex,
  type DecodeFunctionResulData,
} from '../../../abi-decoders/functionResultDecoder.ts';

interface ContractLogDecodingData {
  contractAddress: Address;
  contractFQN: string | undefined;
  functionName: string | undefined;
  abi: Abi | undefined;
  contractRole: 'NORMAL' | 'DELEGATECALL' | 'IMPLEMENTATION';
}

export class ExternalCallResultDecoder {
  public readonly name = 'ExternalCallResultTransform';

  private decodedLogsTxCache: DecodedLogsCache = new DecodedLogsCache();
  private decodedErrorsTxCache: DecodedErrorsCache = new DecodedErrorsCache();

  constructor(
    private artifactsProvider: ArtifactsProvider,
    private addressLabeler: AddressLabeler,
    private functionIndexes: FunctionIndexesRegistry
  ) {}

  async decode(
    resultEvent: ExternalCallResultEvmEvent,
    functionCallEvent: FunctionTraceCall
  ): Promise<FunctionTraceResult> {
    const returnData = bytesToHex(resultEvent.execResult.returnValue);
    const functionResultEvent: FunctionTraceResult = {
      type: 'FunctionResultEvent',
      returnValueRaw: returnData,
      isError: !!resultEvent.execResult.exceptionError,
      isCreate: !!resultEvent.createdAddress,
      logs: [],
    };

    if (functionResultEvent.isError) {
      functionResultEvent.errorType = resultEvent.execResult.exceptionError;
    }

    const decodeData: Array<ContractLogDecodingData & LogContractLogDecodingData & DecodeFunctionResulData> = [];

    // CREATE / CREATE2
    if (functionCallEvent.callType === 'CREATE' || functionCallEvent.callType === 'CREATE2') {
      if (!resultEvent.createdAddress) {
        throw new Error('CREATE/CREATE2 function call without createdAddress');
      }

      functionResultEvent.createdAddress = resultEvent.createdAddress;
      const createdContractFQN = functionCallEvent.createdContractFQN;

      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        const createdContractAbi = this.artifactsProvider.getArtifactAbi(createdContractFQN);

        decodeData.push({
          contractAddress: functionResultEvent.createdAddress,
          functionName: functionCallEvent.functionName,
          contractFQN: createdContractFQN,
          abi: createdContractAbi,
          contractRole: 'NORMAL',
        });

        this.addressLabeler.markContractAddress(resultEvent.createdAddress, createdContractFQN);
      }
    }

    // CALL / STATICCALL
    if (
      functionCallEvent.to &&
      (functionCallEvent.callType === 'CALL' || functionCallEvent.callType === 'STATICCALL')
    ) {
      const contractFQN = functionCallEvent.contractFQN;
      const contractAbi = this.artifactsProvider.getArtifactAbi(contractFQN);

      decodeData.push({
        contractAddress: functionCallEvent.to,
        contractFQN: contractFQN,
        functionName: functionCallEvent.functionName,
        abi: contractAbi,
        contractRole: 'NORMAL',
      });
    }

    // DELEGATECALL
    if (
      functionCallEvent.to &&
      functionCallEvent.implAddress &&
      functionCallEvent.implContractFQN &&
      functionCallEvent.callType === 'DELEGATECALL'
    ) {
      const contractFQN = functionCallEvent.contractFQN;
      const contractAbi = this.artifactsProvider.getArtifactAbi(contractFQN);

      decodeData.push({
        contractAddress: functionCallEvent.to,
        contractFQN: contractFQN,
        functionName: functionCallEvent.functionName,
        abi: contractAbi,
        contractRole: 'DELEGATECALL',
      });

      const implContractFQN = functionCallEvent.implContractFQN;
      const implAbi = this.artifactsProvider.getArtifactAbi(implContractFQN);

      decodeData.push({
        contractAddress: functionCallEvent.implAddress,
        contractFQN: implContractFQN,
        functionName: functionCallEvent.functionName,
        abi: implAbi,
        contractRole: 'IMPLEMENTATION',
      });
    }

    // Decode function result
    const decodedResult = await decodeFunctionResultMultipleAbisWithCache(
      {
        decodeData: decodeData,
        data: returnData,
        isError: functionResultEvent.isError,
      },
      this.decodedErrorsTxCache
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
      if (functionCallEvent.contractFQN && functionCallEvent.functionName && functionCallEvent.type) {
        const contractFQN = functionCallEvent.implContractFQN ?? functionCallEvent.contractFQN;
        const functionIndex = this.functionIndexes.getBy(
          QueryBy.contractAndNameOrKind(contractFQN, functionCallEvent.functionName, functionCallEvent.type)
        );

        functionResultEvent.returnValue = decodeFunctionReturnWithFunctionIndex({ returnData, functionIndex });
      }
    }

    // Decode logs
    if (resultEvent.execResult.logs) {
      for (const ethJsLog of resultEvent.execResult.logs) {
        const rawLog = this.convertToRawLog(ethJsLog);
        const decodedLog = await decodeLogMultipleAbisWithCache({ decodeData, log: rawLog }, this.decodedLogsTxCache);

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

    return functionResultEvent;
  }

  private convertToRawLog(log: [address: Uint8Array, topics: Uint8Array[], data: Uint8Array]): RawLog {
    return [bytesToHex(log[0]), log[1].map((it) => bytesToHex(it)), bytesToHex(log[2])];
  }

  reset(): void {
    this.decodedLogsTxCache = new DecodedLogsCache();
    this.decodedErrorsTxCache = new DecodedErrorsCache();
  }
}
