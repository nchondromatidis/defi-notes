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
import { InvariantError } from '../../../common/errors.js';
import type { FunctionCallTypes, Hex } from '../../types/artifact.js';
import { trySync } from '../../../common/utils.js';
import type { AbiEvent } from 'tevm';

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
    throw new InvariantError('FallbackHandler decoding error: Transaction should have reverted');
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

  // constructor/fallback/receive: nothing to decode
  return undefined;
}

// ############################## Decode Logs ##############################/

export type Log = [address: Uint8Array, topics: Uint8Array[], data: Uint8Array];
export type LensLog = { raw: Log; eventName?: string; args?: unknown; eventSignature?: string };

export function decodeLog(log: Log, abi: Abi | undefined): LensLog {
  const topics = log[1].map((it) => bytesToHex(it));
  const [signature, ...nonSignatureTopics] = topics;

  const result: LensLog = {
    raw: log,
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

      result.eventName = decodedLog.eventName;
      result.args = decodedLog.args;
      result.eventSignature = eventSignature;
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
