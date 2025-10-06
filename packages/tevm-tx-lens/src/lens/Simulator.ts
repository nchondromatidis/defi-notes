import { createTevmTransport, tevmReady, createClient, tevmContract, tevmDeploy } from 'tevm';
import type { ContractFunctionName, TevmTransport } from 'tevm';
import type { Abi, Address, Account, Client, ContractFunctionArgs, AbiStateMutability } from 'viem';
import type { ContractResult, NewContractEvent, Message } from '@tevm/actions';
import type { EvmResult } from '@tevm/evm';

type Next = () => void;

export class Simulator {
  constructor(public readonly client: Client<TevmTransport>) {}

  static async build(nodeAccount: Account): Promise<Simulator> {
    const tevmTransport = createTevmTransport({
      miningConfig: { type: 'auto' },
    });
    const client = createClient({
      account: nodeAccount,
      transport: tevmTransport,
    });
    await tevmReady(client);

    return new Simulator(client);
  }

  async tevmDeploy(params: Parameters<typeof tevmDeploy>[1]) {
    return await tevmDeploy(this.client, params);
  }

  async tevmContract<
    TAbi extends Abi,
    TFunctionName extends ContractFunctionName<TAbi>,
    TArgs extends ContractFunctionArgs<TAbi, AbiStateMutability, TFunctionName>,
  >(
    contract: { abi: TAbi; address: Address },
    functionName: TFunctionName,
    args: TArgs
  ): Promise<ContractResult<TAbi, TFunctionName>> {
    return await tevmContract(this.client, {
      abi: contract.abi,
      to: contract.address,
      functionName,
      args,
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
}
