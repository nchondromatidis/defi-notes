import type { FunctionCallTypes, Hex } from '../types/artifact.ts';
import { InvariantError } from '../../common/errors.ts';
import { AbiFunctionSignatureNotFoundError, decodeAbiParameters, decodeFunctionData } from 'viem';
import { trySync } from '../../common/utils.ts';
import type { ContractAndAbi } from './types.ts';

// types

type DecodeFunctionCallParams<T extends ContractAndAbi | Array<ContractAndAbi>> = Readonly<{
  decodeData: T;
  data: Hex;
  precompile: boolean;
  value?: bigint;
  createdBytecode?: Hex;
}>;

type DecodeFunctionCallReturn = {
  type: FunctionCallTypes;
  contractFQN: string;
  decodedFunctionName: string;
  decodedArgs: unknown;
};

// decode using multiple abis
export function decodeFunctionCallMultipleAbis(
  params: DecodeFunctionCallParams<Array<ContractAndAbi>>
): DecodeFunctionCallReturn | undefined {
  const { data, precompile, value, createdBytecode } = params;
  for (const contractAndAbi of params.decodeData) {
    const decodeResult = decodeFunctionCallOneAbi({
      decodeData: contractAndAbi,
      data,
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
  params: DecodeFunctionCallParams<ContractAndAbi>
): DecodeFunctionCallReturn | undefined {
  const {
    decodeData: { contractFQN, abi },
    data,
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
    const constructorArgsEncoded = ('0x' + data.slice(createdBytecode.length)) as Hex;
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
  const decodeFunctionDataResult = trySync(() => decodeFunctionData({ abi, data }));
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

  // TODO: decode external library call with argument typed storage

  // fallback/receive: function selector failed to match
  const receive = abi.find((x) => x.type === 'receive');
  const fallback = abi.find((x) => x.type === 'fallback');

  const hasData = data !== '0x';
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
