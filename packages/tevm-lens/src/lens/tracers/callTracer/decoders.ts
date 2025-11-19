import {
  type Abi,
  AbiFunctionSignatureNotFoundError,
  decodeFunctionData,
  decodeFunctionResult as decodeFunctionResultViem,
  AbiFunctionNotFoundError,
  decodeAbiParameters,
  decodeErrorResult as decodeErrorResultViem,
} from 'viem';
import { InvariantError } from '../../../common/errors.js';
import type { FunctionCallTypes, Hex } from '../../types/artifact.js';
import { trySync } from '../../../common/utils.js';

// ############################## Decode Function Calls ##############################/

type DecodeFunctionCallParameters = {
  abi: Abi;
  data: Hex;
  value?: bigint;
  createdBytecode?: Hex;
};

type DecodedFunctionCall = {
  functionName: string;
  type: FunctionCallTypes;
  args: unknown;
};

export function decodeFunctionCall(parameters: DecodeFunctionCallParameters): DecodedFunctionCall | undefined {
  const { abi, data, value, createdBytecode } = parameters;
  // constructor: data = contract bytecode + encoded constructor args
  if (createdBytecode) {
    const constructorArgsEncoded = ('0x' + data.slice(createdBytecode.length)) as Hex;
    const description = abi.find((x) => x.type === 'constructor');
    if (!description) throw new InvariantError('constructor not found', { parameters });
    return {
      functionName: '',
      type: 'constructor',
      args: ('inputs' in description && description.inputs && description.inputs.length > 0
        ? decodeAbiParameters(description.inputs, constructorArgsEncoded)
        : undefined) as readonly unknown[] | undefined,
    };
  }

  // function: : function selector + encoded function args
  const decodeFunctionDataResult = trySync(() => decodeFunctionData(parameters));
  if (decodeFunctionDataResult.ok) {
    return {
      functionName: decodeFunctionDataResult.value.functionName,
      type: 'function',
      args: decodeFunctionDataResult.value.args ?? [],
    };
  }
  if (!decodeFunctionDataResult.ok && !(decodeFunctionDataResult.error instanceof AbiFunctionSignatureNotFoundError)) {
    throw decodeFunctionDataResult.error;
  }

  // fallback/receive: function selector failed to match
  const receive = abi.find((x) => x.type === 'receive');
  const fallback = abi.find((x) => x.type === 'fallback');

  const hasData = data.length !== 0;
  const hasValue = value !== undefined;
  const hasReceive = receive !== undefined;
  const hasFallbackPayable = fallback !== undefined && fallback.stateMutability === 'payable';
  const hasFallbackNonPayable = fallback !== undefined && fallback.stateMutability === 'nonpayable';

  const functionHandler = getFallbackHandler(hasData, hasValue, hasFallbackPayable, hasFallbackNonPayable, hasReceive);
  if (functionHandler === 'fallback' && fallback !== undefined) {
    return { functionName: '', type: 'fallback', args: [] };
  }
  if (functionHandler === 'receive' && receive !== undefined) {
    return { functionName: '', type: 'receive', args: [] };
  }
  if (functionHandler === 'revert') {
    throw new InvariantError('Transaction should have reverted');
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

// ############################## Decode Function Results ##############################/

type DecodeFunctionResultParameters =
  | {
      abi: Abi;
      data: Hex;
      functionName: string;
    }
  | {
      abi: Abi;
      data: Hex;
      isError: boolean;
    }
  | {
      abi: Abi;
      data: Hex;
      isCreate: boolean;
    };

type DecodedFunctionResults =
  | {
      isSuccess: false;
      error: ReturnType<typeof decodeErrorResultViem<Abi>>;
    }
  | {
      isSuccess: true;
      functionResult: unknown;
    };

export function decodeFunctionResult(parameters: DecodeFunctionResultParameters): DecodedFunctionResults | undefined {
  const { abi, data } = parameters;
  // error: nothing decode
  if ('isError' in parameters && parameters.isError) {
    const decodedError = decodeErrorResultViem({ abi, data });
    return { isSuccess: false, error: decodedError };
  }

  // function
  if ('functionName' in parameters) {
    const { functionName } = parameters;
    const decodedFunctionResult = trySync(() => decodeFunctionResultViem({ abi, data, functionName }));
    if (decodedFunctionResult.ok) return { isSuccess: true, functionResult: decodedFunctionResult };
    if (!decodedFunctionResult.ok && !(decodedFunctionResult.error instanceof AbiFunctionNotFoundError)) {
      throw decodedFunctionResult.error;
    }
  }

  // constructor/fallback/receive: nothing decode
  return undefined;
}

// ############################## Decode Logs ##############################/
