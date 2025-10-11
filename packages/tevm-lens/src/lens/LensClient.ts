import { type ContractFunctionName, type TevmTransport } from 'tevm';
import { tevmContract, tevmDeploy } from 'tevm';
import {
  type Abi,
  type AbiStateMutability,
  type Client,
  type ContractConstructorArgs,
  type ContractFunctionArgs,
} from 'viem';
import type { ContractResult, Message, NewContractEvent } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import type { ArtifactMap } from '@defi-notes/protocols/types';
import { type Address, type ContractFQN, type Hex, type Next, randomId } from '../common/utils.ts';
import { SupportedContracts } from './SupportedContracts.ts';
import { LabeledContracts } from './LabeledContracts.ts';
import { Tracer } from './Tracer.ts';

export class LensClient {
  constructor(
    public readonly client: Client<TevmTransport>,
    private readonly supportedContracts: SupportedContracts,
    private readonly labeledContracts: LabeledContracts,
    private readonly tracer: Tracer
  ) {}

  async deploy<ContractFQNT extends ContractFQN>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<ArtifactMap[ContractFQNT]['abi']>
  ) {
    const artifact = await this.supportedContracts.getArtifactFrom(contractFQN);
    const deployResult = await tevmDeploy(this.client, {
      abi: artifact.abi as Abi,
      bytecode: artifact.bytecode as Hex,
      args: args as unknown[],
    });
    console.debug('deploy:', deployResult.createdAddress!, contractFQN);
    this.labeledContracts.labelAddress(deployResult.createdAddress!, contractFQN);
    return deployResult;
  }

  async contract<
    TAbi extends Abi,
    TFunctionName extends ContractFunctionName<TAbi>,
    TArgs extends ContractFunctionArgs<TAbi, AbiStateMutability, TFunctionName>,
  >(
    contract: { abi: TAbi; address: Address },
    functionName: TFunctionName,
    args: TArgs
  ): Promise<ContractResult<TAbi, TFunctionName>> {
    const tempId = randomId();
    const deployedResult = await tevmContract(this.client, {
      to: contract.address,
      code: undefined,
      deployedBytecode: undefined,
      abi: contract.abi,
      functionName: functionName,
      args: args,
      onNewContract: async (event: NewContractEvent, next?: Next) => {
        console.debug('onNewContract:NewContractEvent', event.address.toString());
        await this.tracer.handleNewContract(event, tempId);
        next?.();
      },
      onBeforeMessage: async (event: Message, next?: Next) => {
        console.debug('onBeforeMessage:Message', event.to?.toString(), event.depth);
        await this.tracer.handleFunctionCall(event, tempId);
        next?.();
      },
      onAfterMessage: async (event: EvmResult, next?: Next) => {
        console.log('onAfterMessage:EvmResult', event.createdAddress?.toString());
        await this.tracer.handleFunctionReturn(event, tempId);
        next?.();
      },
    });
    await this.tracer.handleTxFinished(deployedResult, tempId);

    return deployedResult;
  }
}
