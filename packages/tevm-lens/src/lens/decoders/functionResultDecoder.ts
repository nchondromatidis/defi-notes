import {
  type Abi,
  AbiFunctionNotFoundError,
  AbiErrorSignatureNotFoundError,
  decodeErrorResult as decodeErrorResultViem,
  decodeFunctionResult as decodeFunctionResultViem,
} from 'viem';
import { trySync } from '../../common/utils.ts';
import type { Hex } from '../types/artifact.ts';
import type { ContractAndAbi } from './types.ts';

// types

type DecodeFunctionResulParams<T extends ContractAndAbi | Array<ContractAndAbi>> = Readonly<
  | { decodeData: T; data: Hex; functionName: string }
  | { decodeData: T; data: Hex; isError: boolean }
  | { decodeData: T; data: Hex; isCreate: boolean }
>;

type DecodedFunctionResults =
  | {
      isSuccess: false;
      rawData: Hex;
      contractFQN: string;
      decodedError: ReturnType<typeof decodeErrorResultViem<Abi>>;
    }
  | {
      isSuccess: true;
      rawData: Hex;
      contractFQN: string;
      decodedFunctionResult: unknown;
    };

// decode using multiple abis
export function decodeFunctionResultMultipleAbis(
  params: DecodeFunctionResulParams<Array<ContractAndAbi>>
): DecodedFunctionResults | undefined {
  for (const contractAndAbi of params.decodeData) {
    const oneAbiParams = { ...params, decodeData: contractAndAbi };
    const decodeResult = decodeFunctionResultOneAbi(oneAbiParams);
    if (decodeResult) return decodeResult;
  }
  return undefined;
}

// one abi

// decode using one abi
export function decodeFunctionResultOneAbi(
  params: DecodeFunctionResulParams<ContractAndAbi>
): DecodedFunctionResults | undefined {
  const {
    decodeData: { contractFQN, abi },
    data,
  } = params;

  if (!contractFQN || !abi) return undefined;

  // error
  if ('isError' in params && params.isError) {
    const decodedError = trySync(() => decodeErrorResultViem({ abi, data }));

    if (decodedError.ok) {
      return { isSuccess: false, rawData: data, contractFQN, decodedError: decodedError.value };
    }
    if (!decodedError.ok && !(decodedError.error instanceof AbiErrorSignatureNotFoundError)) {
      throw decodedError.error;
    }
  }

  // function
  if ('functionName' in params) {
    const { functionName } = params;
    const decodedFunctionResult = trySync(() => decodeFunctionResultViem({ abi, data, functionName }));

    if (decodedFunctionResult.ok) {
      return { isSuccess: true, rawData: data, contractFQN, decodedFunctionResult: decodedFunctionResult };
    }
    if (!decodedFunctionResult.ok && !(decodedFunctionResult.error instanceof AbiFunctionNotFoundError)) {
      throw decodedFunctionResult.error;
    }
  }

  // constructor/fallback/receive: nothing to decode
  return undefined;
}
