import {
  type Abi,
  AbiFunctionNotFoundError,
  AbiErrorSignatureNotFoundError,
  decodeErrorResult as decodeErrorResultViem,
  decodeFunctionResult as decodeFunctionResultViem,
  parseAbiItem,
  decodeAbiParameters,
} from 'viem';
import { trySync } from '../../common/utils.ts';
import type { Hex, LensFunctionIndex } from '../types/artifact.ts';
import { DecodedDataCache } from './DecodedDataCache.ts';

//*************************************** DECODE WITH FUNCTION INDEXES ***************************************//

export function decodeFunctionReturnWithFunctionIndex(params: {
  returnData: `0x${string}`;
  functionIndex?: LensFunctionIndex;
}) {
  if (!params.functionIndex) return undefined;
  const functionInterfaceDecode = params.functionIndex?.functionInterfaceDecode;
  if (functionInterfaceDecode) {
    const functionAbiReturn = trySync(() => parseAbiItem(functionInterfaceDecode.replace(';', '')));
    if (functionAbiReturn.ok) {
      const functionAbi = functionAbiReturn.value;
      if (functionAbi.type === 'function') {
        const paramsReturn = trySync(() => decodeAbiParameters(functionAbi.outputs, params.returnData));
        if (paramsReturn.ok) return paramsReturn.value;
      }
    }
  }
  return undefined;
}

//*************************************** DECODE WITH ABIs ***************************************//

// types

export type DecodeFunctionResulData = {
  contractFQN: string | undefined;
  abi: Abi | undefined;
  functionName: string | undefined;
};

type DecodeFunctionResulParams<T extends DecodeFunctionResulData | Array<DecodeFunctionResulData>> = Readonly<
  { decodeData: T; data: Hex; isError: boolean } | { decodeData: T; data: Hex; isError: boolean; isCreate: boolean }
>;

type DecodedFunctionResult =
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

// with tx cache for errors that bubble up the stack
type ReturnValue = Hex;
export class DecodedErrorsCache extends DecodedDataCache<ReturnValue, DecodedFunctionResult> {}

export async function decodeFunctionResultMultipleAbisWithCache(
  params: DecodeFunctionResulParams<Array<DecodeFunctionResulData>>,
  decodedErrorsCache: DecodedErrorsCache
): Promise<DecodedFunctionResult | undefined> {
  const { data } = params;

  let decodedError = await decodedErrorsCache.get(data);
  if (decodedError) return decodedError;
  decodedError = decodeFunctionResultMultipleAbis(params);
  if (decodedError && params.isError) await decodedErrorsCache.add(data, decodedError);
  return decodedError;
}

// decode using multiple abis
export function decodeFunctionResultMultipleAbis(
  params: DecodeFunctionResulParams<Array<DecodeFunctionResulData>>
): DecodedFunctionResult | undefined {
  for (const decodeData of params.decodeData) {
    const oneAbiParams = { ...params, decodeData };
    const decodeResult = decodeFunctionResultOneAbi(oneAbiParams);
    if (decodeResult) return decodeResult;
  }
  return undefined;
}

// decode using one abi
export function decodeFunctionResultOneAbi(
  params: DecodeFunctionResulParams<DecodeFunctionResulData>
): DecodedFunctionResult | undefined {
  const {
    decodeData: { contractFQN, abi },
    data,
  } = params;

  if (!contractFQN || !abi) return undefined;

  // error
  if (params.isError) {
    const decodedError = trySync(() => decodeErrorResultViem({ abi, data }));

    if (decodedError.ok) {
      return { isSuccess: false, rawData: data, contractFQN, decodedError: decodedError.value };
    }
    if (!decodedError.ok && !(decodedError.error instanceof AbiErrorSignatureNotFoundError)) {
      throw decodedError.error;
    }
    return undefined;
  }

  // function
  if (params.decodeData.functionName) {
    const { functionName } = params.decodeData;
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
