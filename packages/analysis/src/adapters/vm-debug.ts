import {
  type ContractFunctionName,
  encodeFunctionData,
  decodeFunctionResult,
  tevmCall,
  type TevmTransport,
} from 'tevm';
import type {
  Abi,
  Address,
  Client,
  ContractFunctionArgs,
  AbiStateMutability,
  ContractFunctionReturnType,
} from 'viem';

export async function debugCall<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi>,
  TArgs extends ContractFunctionArgs<TAbi, AbiStateMutability, TFunctionName>,
  TReturn extends ContractFunctionReturnType<
    TAbi,
    AbiStateMutability,
    TFunctionName
  >,
>(
  client: Client<TevmTransport>,
  contract: { abi: TAbi; address: Address },
  functionName: TFunctionName,
  args: TArgs
): Promise<TReturn> {
  // TODO: fix type casting
  const result = await tevmCall(client, {
    to: contract.address,
    data: encodeFunctionData({
      abi: contract.abi,
      functionName,
      args,
    } as never),
    // TODO: looks like types are wrong
    // @ts-expect-error — not in typings yet
    onStep: (step: InterpreterStep, next: () => void) => {
      console.log('EVM Step:', {
        cpc: step.pc, // Program counter
        opcode: step.opcode, // Current opcode
        gasLeft: step.gasLeft, // Remaining gas
        stack: step.stack, // Stack contents
        depth: step.depth, // Call depth
      });
      next?.();
    },
  });

  // TODO: check for errors

  // TODO: fix type casting
  return decodeFunctionResult({
    abi: contract.abi,
    functionName,
    data: result.rawData,
  } as never) as TReturn;
}
