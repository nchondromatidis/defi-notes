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
import type { ContractResult, NewContractEvent, Message } from '@tevm/actions';
import type { InterpreterStep, EvmResult } from '@tevm/evm';

type Next = () => void;

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
    onStep: (data: InterpreterStep, next: Next) => {
      console.log('EVM Step:', {
        cpc: data.pc, // Program counter
        opcode: data.opcode, // Current opcode
        gasLeft: data.gasLeft, // Remaining gas
        stack: data.stack, // Stack contents
        depth: data.depth, // Call depth
        address: data.address.toString(), // Call depth
      });
      next?.();
    },
    onNewContract: (data: NewContractEvent, next?: Next) => {
      console.log('New Contract', {
        address: data.address,
      });
      next?.();
    },
    onBeforeMessage: (data: Message, next?: Next) => {
      console.log('Executing message:', {
        to: data.to?.toString(),
        value: data.value.toString(),
        delegatecall: data.delegatecall,
      });
      next?.();
    },
    onAfterMessage: (data: EvmResult, next?: Next) => {
      console.log('Message result:', {
        gasUsed: data.execResult.executionGasUsed.toString(),
        returnValue: data.execResult.returnValue.toString(),
        error: data.execResult.exceptionError?.error,
      });
      next?.();
    },
  } as never); // TODO: fix casting to never
}
