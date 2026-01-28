import { HandlerBase } from '../HandlerBase.ts';
import type { ExternalCallResultEvmEvent } from '../_events/lens-evm-events.ts';
import { bytesToHex } from 'viem';
import type { FunctionCallEvent, FunctionResultEvent, LensLog } from '../../call-tracer/CallTrace.ts';
import {
  type ContractLogDecodingData,
  DecodedLogsCache,
  decodeLogMultipleAbisWithCache,
} from '../../abi-decoders/logDecoder.ts';
import {
  DecodedErrorsCache,
  type DecodeFunctionResulData,
  decodeFunctionResultMultipleAbisWithCache,
  decodeFunctionReturnWithFunctionIndex,
} from '../../abi-decoders/functionResultDecoder.ts';
import { InvariantError } from '../../../_common/errors.ts';
import { QueryBy } from '../../indexes/FunctionIndexesRegistry.ts';
import type { RawLog } from '../../types.ts';

/*
 * Detects and decodes external function call result data and logs. <br>
 * Handles function results (return, exits, logs, errors) initiated from external calls. <br>
 * All of these opcodes are abstracted as `EvmResult` object from tevm. <br>
 * <b> Marks the end of an execution context at depth X. </b>
 *
 * <i>
 * functionCall.contractFQN --debugMetadata.artifacts--> ABIs  + returnValue + logValues --decoders--> function call result
 * </i>
 */
export class ExternalCallResultHandler extends HandlerBase {
  private decodedLogsTxCache: DecodedLogsCache = new DecodedLogsCache();
  private decodedErrorsTxCache: DecodedErrorsCache = new DecodedErrorsCache();

  async handle(resultEvent: ExternalCallResultEvmEvent, functionCallEvent: FunctionCallEvent) {
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
    if (functionCallEvent.callType === 'CREATE' || functionCallEvent.callType === 'CREATE2') {
      if (!resultEvent.createdAddress) {
        throw new InvariantError('CREATE/CREATE2 function call without createdAddress');
      }
      functionResultEvent.isCreate = true;
      functionResultEvent.createdAddress = resultEvent.createdAddress;
      const createdContractFQN = functionCallEvent.createdContractFQN;
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

        this.addressLabeler.markContractAddress(resultEvent.createdAddress, createdContractFQN);
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
        functionName: functionCallEvent.functionName,
        abi: implAbi,
        contractRole: 'IMPLEMENTATION',
      });
    }

    // decoding result
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
        const functionIndex = this.debugMetadata.functions.getBy(
          QueryBy.contractAndNameOrKind(contractFQN, functionCallEvent.functionName, functionCallEvent.type)
        );

        functionResultEvent.returnValue = decodeFunctionReturnWithFunctionIndex({ returnData, functionIndex });
      }
    }

    // decoding logs
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

  public reset() {
    this.decodedLogsTxCache = new DecodedLogsCache();
    this.decodedErrorsTxCache = new DecodedErrorsCache();
  }

  private convertToRawLog(log: [address: Uint8Array, topics: Uint8Array[], data: Uint8Array]): RawLog {
    return [bytesToHex(log[0]), log[1].map((it) => bytesToHex(it)), bytesToHex(log[2])];
  }
}
