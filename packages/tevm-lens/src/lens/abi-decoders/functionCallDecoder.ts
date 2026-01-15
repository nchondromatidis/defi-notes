import type { FunctionCallTypes, Hex, LensFunctionIndex } from '../types.ts';
import { InvariantError } from '../../common/errors.ts';
import {
  type Abi,
  AbiFunctionSignatureNotFoundError,
  decodeAbiParameters,
  decodeFunctionData,
  parseAbiItem,
} from 'viem';
import { trySync } from '../../common/utils.ts';

//*************************************** DECODE WITH FUNCTION INDEXES ***************************************//

export function decodeFunctionCallWithFunctionIndexes(params: {
  callData: `0x${string}`;
  functionIndex?: LensFunctionIndex;
}) {
  if (!params.functionIndex) return undefined;
  const functionInterfaceDecode = params.functionIndex?.humanReadableABI?.replace(';', '');
  if (functionInterfaceDecode) {
    const functionAbiReturn = trySync(() => parseAbiItem(functionInterfaceDecode));
    if (functionAbiReturn.ok) {
      const functionAbi = functionAbiReturn.value;
      if (functionAbi.type === 'function') {
        const paramsReturn = trySync(() =>
          decodeAbiParameters(functionAbi.inputs, `0x${params.callData.slice(10, params.callData.length)}`)
        );
        if (paramsReturn.ok) return paramsReturn.value;
      }
    }
  }
  return undefined;
}

//*************************************** DECODE WITH ABIs ***************************************//

// types
export type DecodeFunctionCallData = { contractFQN: string | undefined; abi: Abi | undefined };

type DecodeFunctionCallParams<T extends DecodeFunctionCallData | Array<DecodeFunctionCallData>> = Readonly<{
  decodeData: T;
  rawData: Hex;
  precompile: boolean;
  value?: bigint;
  createdBytecode?: Hex;
}>;

type DecodedFunctionCall = {
  type: FunctionCallTypes;
  contractFQN: string;
  decodedFunctionName: string;
  decodedArgs: unknown;
};

// decode using multiple abis
export function decodeFunctionCallMultipleAbis(
  params: DecodeFunctionCallParams<Array<DecodeFunctionCallData>>
): DecodedFunctionCall | undefined {
  const { rawData, precompile, value, createdBytecode } = params;
  for (const contractAndAbi of params.decodeData) {
    const decodeResult = decodeFunctionCallOneAbi({
      decodeData: contractAndAbi,
      rawData,
      precompile,
      value,
      createdBytecode,
    });
    if (decodeResult) return decodeResult;
  }
  return undefined;
}

// decode using one abi
export function decodeFunctionCallOneAbi(
  params: DecodeFunctionCallParams<DecodeFunctionCallData>
): DecodedFunctionCall | undefined {
  const {
    decodeData: { contractFQN, abi },
    rawData,
    precompile,
    value,
    createdBytecode,
  } = params;

  if (!abi || !contractFQN) return undefined;

  // precompiler
  if (precompile) {
    // TODO: handle
  }

  // constructor: data = contract bytecode + encoded constructor args
  if (createdBytecode) {
    const constructorArgsEncoded = ('0x' + rawData.slice(createdBytecode.length)) as Hex;
    const description = abi.find((x) => x.type === 'constructor');
    if (!description) throw new InvariantError('constructor not found', { parameters: params });
    return {
      type: 'constructor',
      decodedFunctionName: '',
      contractFQN,
      decodedArgs: ('inputs' in description && description.inputs && description.inputs.length > 0
        ? decodeAbiParameters(description.inputs, constructorArgsEncoded)
        : undefined) as readonly unknown[] | undefined,
    };
  }

  // function: : function selector + encoded function args
  const decodeFunctionDataResult = trySync(() => decodeFunctionData({ abi, data: rawData }));
  if (decodeFunctionDataResult.ok) {
    return {
      type: 'function',
      contractFQN,
      decodedFunctionName: decodeFunctionDataResult.value.functionName,
      decodedArgs: decodeFunctionDataResult.value.args ?? [],
    };
  }
  if (!decodeFunctionDataResult.ok && !(decodeFunctionDataResult.error instanceof AbiFunctionSignatureNotFoundError)) {
    throw decodeFunctionDataResult.error;
  }

  // fallback/receive: function selector failed to match
  const receive = abi.find((x) => x.type === 'receive');
  const fallback = abi.find((x) => x.type === 'fallback');

  const hasData = rawData !== '0x';
  const hasValue = value !== undefined;
  const hasReceive = receive !== undefined;
  const hasFallbackPayable = fallback !== undefined && fallback.stateMutability === 'payable';
  const hasFallbackNonPayable = fallback !== undefined && fallback.stateMutability === 'nonpayable';

  const functionHandler = getFallbackHandler(hasData, hasValue, hasFallbackPayable, hasFallbackNonPayable, hasReceive);
  if (functionHandler === 'fallback' && fallback !== undefined) {
    return { decodedFunctionName: '', type: 'fallback', contractFQN, decodedArgs: [] };
  }
  if (functionHandler === 'receive' && receive !== undefined) {
    return { decodedFunctionName: '', type: 'receive', contractFQN, decodedArgs: [] };
  }
  if (functionHandler === 'revert') {
    // ignore
  }

  return undefined;
}

function getFallbackHandler(
  hasData: boolean,
  hasValue: boolean,
  hasFallbackPayable: boolean,
  hasFallbackNonPayable: boolean,
  hasReceive: boolean
): 'fallback' | 'receive' | 'revert' {
  if (hasData) {
    return hasFallbackPayable || hasFallbackNonPayable ? 'fallback' : 'revert';
  }
  if (hasValue) {
    if (hasReceive) return 'receive';
    if (hasFallbackPayable) return 'fallback';
    return 'revert';
  }
  if (hasFallbackPayable || hasFallbackNonPayable) return 'fallback';
  return 'revert';
}
