import { type ContractFunctionName, type TevmTransport } from 'tevm';
import { tevmContract, tevmDeploy } from 'tevm';
import {
  type Abi,
  type AbiStateMutability,
  type Client,
  type ContractConstructorArgs,
  type ContractFunctionArgs,
  getContract,
} from 'viem';
import type { ContractResult, Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { randomId } from '../common/utils.ts';
import { SupportedContracts } from './SupportedContracts.ts';
import { DeployedContracts } from './DeployedContracts.ts';
import { Tracer } from './Tracer.ts';
import { InvariantError } from '../common/errors.ts';
import type { Address, Hex, LensArtifactsMap, LensContractFQN } from './artifact.ts';

export type Next = () => void;

export class LensClient<TMap extends LensArtifactsMap<TMap>> {
  constructor(
    public readonly client: Client<TevmTransport>,
    public readonly supportedContracts: SupportedContracts<TMap>,
    public readonly deployedContracts: DeployedContracts<TMap>,
    public readonly tracer: Tracer<TMap>
  ) {}

  async deploy<ContractFQNT extends LensContractFQN<TMap>>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<TMap[ContractFQNT]['abi']>
  ) {
    const artifact = await this.supportedContracts.getArtifactFrom(contractFQN);
    const deployResult = await tevmDeploy(this.client, {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      args: args as unknown[],
    });
    if (!deployResult.createdAddress) throw new InvariantError('createdAddress missing after deploy');
    this.deployedContracts.markContractAddress(deployResult.createdAddress, contractFQN);
    return deployResult;
  }

  async contract<
    TAbi extends Abi,
    TFunctionName extends ContractFunctionName<TAbi>,
    TArgs extends ContractFunctionArgs<TAbi, AbiStateMutability, TFunctionName>,
  >(
    contract: { abi: TAbi; address: Address },
    functionName: TFunctionName,
    args: TArgs,
    traceTx = true
  ): Promise<ContractResult<TAbi, TFunctionName>> {
    const tempId = randomId();
    if (traceTx) this.tracer.startTxTrace(tempId);
    const deployedResult = await tevmContract(this.client, {
      to: contract.address,
      code: undefined,
      deployedBytecode: undefined,
      abi: contract.abi,
      functionName: functionName,
      args: args,
      onBeforeMessage: async (event: Message, next?: Next) => {
        console.debug('onBeforeMessage:Message', event.to?.toString(), event.depth);
        if (traceTx) await this.tracer.handleFunctionCall(event, tempId);
        next?.();
      },
      onAfterMessage: async (event: EvmResult, next?: Next) => {
        console.log('onAfterMessage:EvmResult', event.execResult.returnValue);
        if (traceTx) await this.tracer.handleFunctionResult(event, tempId);
        next?.();
      },
    });
    if (traceTx) this.tracer.stopTxTrace(deployedResult.txHash, tempId);

    return deployedResult;
  }

  async getContract<ContractFqnT extends LensContractFQN<TMap>>(address: Hex, contractFQN: ContractFqnT) {
    const contractArtifact = await this.supportedContracts.getArtifactFrom(contractFQN);
    return getContract({
      address: address,
      abi: contractArtifact.abi as TMap[ContractFqnT]['abi'],
      client: this.client,
    });
  }
}
