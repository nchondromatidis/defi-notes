import {
  type Abi,
  AbiFunctionSignatureNotFoundError,
  decodeFunctionData,
  decodeFunctionResult as decodeFunctionResultViem,
  AbiFunctionNotFoundError,
  decodeAbiParameters,
  decodeErrorResult as decodeErrorResultViem,
  bytesToHex,
  decodeEventLog,
  toEventSignature,
  AbiEventSignatureNotFoundError,
} from 'viem';
import { InvariantError } from '../../../common/errors.ts';
import type { FunctionCallTypes, Hex } from '../../types/artifact.ts';
import { trySync } from '../../../common/utils.ts';
import type { AbiEvent } from 'tevm';

// ############################## Decode Function Calls ##############################/

// multiple abis

type decodeFunctionCallMultipleAbisParams = {
  contractsAndAbis: Array<{ contractFQN: string | undefined; abi: Abi | undefined }>;
  data: Hex;
  precompile: boolean;
  value?: bigint;
  createdBytecode?: Hex;
};

type DecodeFunctionCallMultipleAbisReturn = {
  type: FunctionCallTypes;
  contractFQN: string;
  decodedFunctionName: string;
  decodedArgs: unknown;
};

export function decodeFunctionCallMultipleAbis(
  params: decodeFunctionCallMultipleAbisParams
): DecodeFunctionCallMultipleAbisReturn | undefined {
  const { data, precompile, value, createdBytecode } = params;
  for (const { contractFQN, abi } of params.contractsAndAbis) {
    if (!contractFQN || !abi) continue;
    const decodeResult = decodeFunctionCallOneAbi({ abi, data, precompile, value, createdBytecode });
    if (decodeResult) {
      return {
        contractFQN,
        ...decodeResult,
      };
    }
  }
  return undefined;
}

// one abi

type DecodeFunctionCallOneAbiParams = {
  abi: Abi;
  data: Hex;
  precompile: boolean;
  value?: bigint;
  createdBytecode?: Hex;
};

type DecodedFunctionCallOneAbiReturn = {
  type: FunctionCallTypes;
  decodedFunctionName: string;
  decodedArgs: unknown;
};

export function decodeFunctionCallOneAbi(
  params: DecodeFunctionCallOneAbiParams
): DecodedFunctionCallOneAbiReturn | undefined {
  const { abi, data, precompile, value, createdBytecode } = params;

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
      decodedArgs: ('inputs' in description && description.inputs && description.inputs.length > 0
        ? decodeAbiParameters(description.inputs, constructorArgsEncoded)
        : undefined) as readonly unknown[] | undefined,
    };
  }

  // function: : function selector + encoded function args
  const decodeFunctionDataResult = trySync(() => decodeFunctionData(params));
  if (decodeFunctionDataResult.ok) {
    return {
      type: 'function',
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

  const hasData = data !== '0x';
  const hasValue = value !== undefined;
  const hasReceive = receive !== undefined;
  const hasFallbackPayable = fallback !== undefined && fallback.stateMutability === 'payable';
  const hasFallbackNonPayable = fallback !== undefined && fallback.stateMutability === 'nonpayable';

  const functionHandler = getFallbackHandler(hasData, hasValue, hasFallbackPayable, hasFallbackNonPayable, hasReceive);
  if (functionHandler === 'fallback' && fallback !== undefined) {
    return { decodedFunctionName: '', type: 'fallback', decodedArgs: [] };
  }
  if (functionHandler === 'receive' && receive !== undefined) {
    return { decodedFunctionName: '', type: 'receive', decodedArgs: [] };
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
      rawData: Hex;
      decodedError: ReturnType<typeof decodeErrorResultViem<Abi>>;
    }
  | {
      isSuccess: true;
      rawData: Hex;
      decodedFunctionResult: unknown;
    };

export function decodeFunctionResult(parameters: DecodeFunctionResultParameters): DecodedFunctionResults | undefined {
  const { abi, data } = parameters;
  // error
  if ('isError' in parameters && parameters.isError) {
    const decodedError = decodeErrorResultViem({ abi, data });
    return { isSuccess: false, decodedError: decodedError, rawData: data };
  }

  // function
  if ('functionName' in parameters) {
    const { functionName } = parameters;
    const decodedFunctionResult = trySync(() => decodeFunctionResultViem({ abi, data, functionName }));

    if (decodedFunctionResult.ok) {
      return { isSuccess: true, decodedFunctionResult: decodedFunctionResult, rawData: data };
    }
    if (!decodedFunctionResult.ok && !(decodedFunctionResult.error instanceof AbiFunctionNotFoundError)) {
      throw decodedFunctionResult.error;
    }
  }

  // constructor/fallback/receive: nothing to decode
  return undefined;
}

// ############################## Decode Logs ##############################/

export type Log = [address: Uint8Array, topics: Uint8Array[], data: Uint8Array];
export type LensLog = {
  rawData: Log;
  decodedEventName?: string;
  decodedArgs?: unknown;
  decodedEventSignature?: string;
};

export function decodeLog(log: Log, abi: Abi | undefined): LensLog {
  const topics = log[1].map((it) => bytesToHex(it));
  const [signature, ...nonSignatureTopics] = topics;

  const result: LensLog = {
    rawData: log,
  };

  if (!abi) return result;

  const decodedLogResult = trySync(() =>
    decodeEventLog({
      abi: abi,
      topics: [signature, ...nonSignatureTopics],
      data: bytesToHex(log[2]),
    })
  );

  if (decodedLogResult.ok) {
    let eventSignature: string | undefined = undefined;
    const decodedLog = decodedLogResult.value;
    if (decodedLog.eventName) {
      const abiEvent = findEventByName(abi, decodedLog.eventName);
      eventSignature = abiEvent ? toEventSignature(abiEvent) : undefined;

      result.decodedEventName = decodedLog.eventName;
      result.decodedArgs = decodedLog.args;
      result.decodedEventSignature = eventSignature;
    }
  }
  if (!decodedLogResult.ok && !(decodedLogResult.error instanceof AbiEventSignatureNotFoundError)) {
    throw decodedLogResult.error;
  }

  return result;
}

function findEventByName(abi: Abi, name: string): AbiEvent {
  const ev = abi.find((i): i is AbiEvent => i.type === 'event' && i.name === name);
  if (!ev) throw new Error('Event not found');
  return ev;
}
