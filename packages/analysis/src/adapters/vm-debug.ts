import {
  type ContractFunctionName,
  type TevmTransport,
  tevmContract,
} from 'tevm';
import type {
  Abi,
  Address,
  Client,
  ContractFunctionArgs,
  AbiStateMutability,
} from 'viem';
import type { ContractResult } from '@tevm/actions';
import type { InterpreterStep } from '@ethereumjs/evm';

export async function debugCall<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi>,
  TArgs extends ContractFunctionArgs<TAbi, AbiStateMutability, TFunctionName>,
>(
  client: Client<TevmTransport>,
  contract: { abi: TAbi; address: Address },
  functionName: TFunctionName,
  args: TArgs
): Promise<ContractResult<TAbi, TFunctionName>> {
  return await tevmContract(client, {
    abi: contract.abi,
    to: contract.address,
    functionName,
    args,
    onStep: (step: InterpreterStep, next: () => void) => {
      console.log('EVM Step:', {
        cpc: step.pc, // Program counter
        opcode: step.opcode, // Current opcode
        gasLeft: step.gasLeft, // Remaining gas
        stack: step.stack, // Stack contents
        depth: step.depth, // Call depth
        address: step.address.toString(), // Call depth
      });
      next?.();
    },
  } as never);
}
