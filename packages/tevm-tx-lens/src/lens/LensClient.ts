import type { ContractFunctionName, TevmTransport } from 'tevm';
import { tevmContract, tevmDeploy } from 'tevm';
import type {
  Abi,
  AbiStateMutability,
  Address,
  Client,
  ContractConstructorArgs,
  ContractFunctionArgs,
  Hex,
} from 'viem';
import { bytesToHex } from 'viem';
import type { ContractResult, Message, NewContractEvent } from '@tevm/actions';
import type { EvmResult } from '@tevm/evm';
import type { ArtifactMap } from '@defi-notes/protocols/types';
import { type ContractFQN, type Next } from '../common/utils.ts';
import { SupportedContracts } from './SupportedContracts.ts';
import { DeployedContracts } from './DeployedContracts.ts';

export class LensClient {
  constructor(
    public readonly client: Client<TevmTransport>,
    private readonly supportedContracts: SupportedContracts,
    private readonly deployedContracts: DeployedContracts
  ) {}

  async deploy<ContractFQNT extends ContractFQN>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<ArtifactMap[ContractFQNT]['abi']>
  ) {
    const artifact = await this.supportedContracts.getContractArtifact(contractFQN);
    const deployResult = await tevmDeploy(this.client, {
      abi: artifact.abi as Abi,
      bytecode: artifact.bytecode as Hex,
      args: args as unknown[],
    });
    this.deployedContracts.register(deployResult.createdAddress!, contractFQN);
    return deployResult;
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
        const contractFQN = this.supportedContracts.getContractFqnFrom(bytesToHex(data.code));
        this.deployedContracts.register(data.address.toString(), contractFQN, true);
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
