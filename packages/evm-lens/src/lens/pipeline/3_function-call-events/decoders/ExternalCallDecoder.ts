import type { ExternalCallEvmEvent } from '../../2_evm-events/evm-events.ts';
import type { FunctionTraceCall } from '../../4_function-trace/FunctionTraceBuilder.ts';
import type { Abi } from 'viem';
import { bytesToHex } from 'viem';
import {
  decodeFunctionCallMultipleAbis,
  decodeFunctionCallWithFunctionIndexes,
} from '../../../abi-decoders/functionCallDecoder.ts';
import type { Address } from '../../../types.ts';
import type { ArtifactsProvider } from '../../../indexes/ArtifactsProvider.ts';
import type { AddressLabeler } from '../../../indexes/AddressLabeler.ts';
import type { FunctionIndexesRegistry } from '../../../indexes/FunctionIndexesRegistry.ts';
import { QueryBy } from '../../../indexes/FunctionIndexesRegistry.ts';

export class ExternalCallDecoder {
  public readonly name = 'ExternalCallTransform';

  constructor(
    private artifactsProvider: ArtifactsProvider,
    private addressLabeler: AddressLabeler,
    private functionIndexes: FunctionIndexesRegistry
  ) {}

  decode(event: ExternalCallEvmEvent): FunctionTraceCall {
    const functionCallEvent: FunctionTraceCall = {
      type: 'FunctionCallEvent',
      to: event?.to,
      from: event.caller,
      depth: event.depth,
      rawData: event.data,
      value: event.value,
      callType: 'EXTERNAL',
      precompile: event.isCompiled,
    };

    let bytecode: `0x${string}` | undefined;
    const decodingData: Array<{ contractFQN: string | undefined; abi: Abi | undefined }> = [];

    // CREATE / CREATE2
    if (!event.to) {
      functionCallEvent.callType = 'CREATE';
      if (event.salt) functionCallEvent.callType = 'CREATE2';

      functionCallEvent.create2Salt = event.salt ? bytesToHex(event.salt) : undefined;

      const result = this.artifactsProvider.getContractFqnFromCallData(event.data);

      bytecode = result.bytecode;
      const newContractFQN = result.newContractFQN;
      functionCallEvent.createdContractFQN = newContractFQN;
      const createdContractAbi = this.artifactsProvider.getArtifactAbi(newContractFQN);

      decodingData.push({ contractFQN: newContractFQN, abi: createdContractAbi });
    }

    // CALL / STATICCALL
    if (event.to) {
      functionCallEvent.callType = 'CALL';
      if (event.isStatic) functionCallEvent.callType = 'STATICCALL';

      const contractFQN = this.addressLabeler.getContractFqnForAddress(event.to);
      functionCallEvent.contractFQN = contractFQN;

      const { contractAbi, linkLibraries } = this.artifactsProvider.getAllAbisRelatedTo(contractFQN);
      decodingData.push({ contractFQN, abi: contractAbi });

      for (const linkLibrary of linkLibraries) {
        decodingData.push({ contractFQN: linkLibrary.fqn, abi: linkLibrary.abi });
      }
    }

    // DELEGATECALL
    if (event.to && event.delegatecall) {
      functionCallEvent.callType = 'DELEGATECALL';
      functionCallEvent.contractFQN = this.addressLabeler.getContractFqnForAddress(event.to);

      const codeAddress = (event as any)['_codeAddress']?.toString() as Address;
      if (!codeAddress) {
        throw new Error('codeAddress is empty for DELEGATECALL');
      }

      const implContractFQN = this.addressLabeler.getContractFqnForAddress(codeAddress);
      functionCallEvent.implContractFQN = implContractFQN;
      functionCallEvent.implAddress = codeAddress;

      const implAbi = this.artifactsProvider.getArtifactAbi(implContractFQN);
      decodingData.push({ contractFQN: implContractFQN, abi: implAbi });
    }

    // Decode function call
    const decodedFunctionCall = decodeFunctionCallMultipleAbis({
      decodeData: decodingData,
      rawData: event.data,
      precompile: functionCallEvent.precompile,
      value: event.value,
      createdBytecode: bytecode,
    });

    if (decodedFunctionCall) {
      functionCallEvent.functionName = decodedFunctionCall.decodedFunctionName;
      functionCallEvent.functionType = decodedFunctionCall.type;
      functionCallEvent.args = decodedFunctionCall.decodedArgs;

      const functionIndex = this.functionIndexes.getBy(
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

    // Fallback: selector not matching ABI
    if (!decodedFunctionCall) {
      const functionSelector = event.data.slice(2, 10);
      const contractFQN = functionCallEvent.implContractFQN ?? functionCallEvent.contractFQN;

      if (contractFQN) {
        const functionIndex = this.functionIndexes.getBy(QueryBy.contractAndSelector(contractFQN, functionSelector));

        functionCallEvent.functionName = functionIndex?.name;
        functionCallEvent.functionType = functionIndex?.kind;
        functionCallEvent.functionLineStart = functionIndex?.functionLineStart;
        functionCallEvent.functionLineEnd = functionIndex?.functionLineEnd;
        functionCallEvent.functionSource = functionIndex?.source;
        functionCallEvent.args = decodeFunctionCallWithFunctionIndexes({
          callData: event.data,
          functionIndex: functionIndex as any,
        });
      }
    }

    return functionCallEvent;
  }

  reset(): void {
    // No state to reset
  }
}
