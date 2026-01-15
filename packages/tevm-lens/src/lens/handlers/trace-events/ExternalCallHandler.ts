import { HandlerBase } from '../HandlerBase.ts';
import type { Message } from 'tevm/actions';
import { type Abi, bytesToHex } from 'viem';
import type { FunctionCallEvent } from '../../CallTrace.ts';
import type { Address } from '../../types.ts';
import { InvariantError } from '../../../common/errors.ts';
import {
  decodeFunctionCallMultipleAbis,
  decodeFunctionCallWithFunctionIndexes,
} from '../../abi-decoders/functionCallDecoder.ts';
import { QueryBy } from '../../indexes/FunctionIndexesRegistry.ts';

/*
 * Detects and decodes external function calls. <br>
 * Handles opcodes: 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2'. <br>
 * All of these opcodes are abstracted as `Message` object from tevm. <br>
 * <b> Marks the start of an execution context at depth X. </b>
 *
 * <i>
 * event.to --labeledContracts--> contractFQN --debugMetadata.artifacts--> ABIs  + calldata --decoders-->
 * decoded function call --debugMetadata.functions--> function call
 * </>
 */
export class ExternalCallHandler extends HandlerBase {
  public async handle(callEvent: Message) {
    // base function call object
    const callData = bytesToHex(callEvent.data);
    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: callEvent?.to?.toString(),
      from: callEvent.caller.toString(),
      depth: callEvent.depth,
      rawData: callData,
      value: callEvent.value,
      callType: 'EXTERNAL',
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
      const contractFQN = this.addressLabeler.getContractFqnForAddress(callEvent.to.toString());
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

      // delegate call caller contract
      functionCallEvent.contractFQN = this.addressLabeler.getContractFqnForAddress(callEvent.to.toString());

      // callEvent type missing _codeAddress, but implementation has it
      const codeAddress = (callEvent as any)['_codeAddress'].toString() as Address;
      if (!codeAddress) throw new InvariantError('codeAddress is empty', { callEvent, functionCallEvent });

      // delegate call implementation contract
      const implContractFQN = this.addressLabeler.getContractFqnForAddress(codeAddress);
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

      const functionIndex = this.debugMetadata.functions.getBy(
        QueryBy.contractAndNameOrKind(
          decodedFunctionCall.contractFQN,
          decodedFunctionCall.decodedFunctionName,
          decodedFunctionCall.type
        )
      );
      functionCallEvent.functionLineStart = functionIndex?.functionLineStart;
      functionCallEvent.functionLineEnd = functionIndex?.functionLineEnd;
      functionCallEvent.functionSource = functionIndex?.source;
    }

    // External function call, selector not matching ABI
    if (!decodedFunctionCall) {
      const functionSelector = callData.slice(2, 10);
      const contractFQN = functionCallEvent.implContractFQN ?? functionCallEvent.contractFQN;
      if (contractFQN) {
        const functionIndex = this.debugMetadata.functions.getBy(
          QueryBy.contractAndSelector(contractFQN, functionSelector)
        );

        functionCallEvent.functionName = functionIndex?.name;
        functionCallEvent.functionType = functionIndex?.kind;
        functionCallEvent.functionLineStart = functionIndex?.functionLineStart;
        functionCallEvent.functionLineEnd = functionIndex?.functionLineEnd;
        functionCallEvent.functionSource = functionIndex?.source;
        functionCallEvent.args = decodeFunctionCallWithFunctionIndexes({ callData, functionIndex });
      }
    }

    return functionCallEvent;
  }
}
