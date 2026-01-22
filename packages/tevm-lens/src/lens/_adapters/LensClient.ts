import { type ContractFunctionName, type TevmTransport } from 'tevm';
import { tevmContract, tevmDeploy } from 'tevm';
import {
  type Abi,
  type AbiStateMutability,
  type ContractConstructorArgs,
  type ContractFunctionArgs,
  getContract,
  type PrivateKeyAccount,
} from 'viem';
import type { ContractResult, Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { DebugMetadata } from '../indexes/DebugMetadata.ts';
import { AddressLabeler } from '../indexes/AddressLabeler.ts';
import { CallTracer } from '../CallTracer.ts';
import { InvalidArgument, InvariantError } from '../_common/errors.ts';
import type { Address, Hex, LensArtifactsMap } from '../types.ts';
import type { InterpreterStep } from 'tevm/evm';
import { hardhatLinkExternalLibToBytecode } from '../utils/hardhat-utils.ts';
import { buildClient, type PublicTestClient } from './client.ts';

export type Next = () => void;

export class LensClient<
  ArtifactMapT extends object,
  LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT> = LensArtifactsMap<ArtifactMapT>,
> {
  constructor(
    public deployerAccount: PrivateKeyAccount,
    public client: PublicTestClient<TevmTransport>,
    public readonly debugMetadata: DebugMetadata,
    public readonly addressLabeler: AddressLabeler,
    public readonly callTracer: CallTracer
  ) {}

  async deploy<ContractFQNT extends keyof LensArtifactsMapT & string>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<LensArtifactsMapT[ContractFQNT]['abi']>,
    librariesToLink: Array<{ libFQN: ContractFQNT; address: Address }> = []
  ) {
    const artifact = this.debugMetadata.artifacts.getArtifactFrom(contractFQN);
    if (!artifact) throw new InvalidArgument(`Artifact for ${contractFQN} not found.`);

    let bytecode = artifact.bytecode;
    for (const lib of librariesToLink) {
      bytecode = hardhatLinkExternalLibToBytecode(bytecode, lib.libFQN, lib.address);
    }
    const deployResult = await tevmDeploy(this.client, {
      abi: artifact.abi,
      bytecode: bytecode,
      args: args as unknown[],
    });
    if (!deployResult.createdAddress) throw new InvariantError('createdAddress missing after deploy');
    this.addressLabeler.markContractAddress(deployResult.createdAddress, contractFQN);
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
    value?: bigint,
    traceTx = true
  ): Promise<ContractResult<TAbi, TFunctionName>> {
    if (traceTx) this.callTracer.reset();
    const contractTxResult = await tevmContract(this.client, {
      to: contract.address,
      code: undefined,
      value,
      deployedBytecode: undefined,
      abi: contract.abi,
      functionName: functionName,
      args: args,
      throwOnFail: false,
      onStep: async (event: InterpreterStep, next?: Next) => {
        if (traceTx) await this.callTracer.register(event);
        next?.();
      },
      onBeforeMessage: async (event: Message, next?: Next) => {
        if (traceTx) await this.callTracer.register(event);
        next?.();
      },
      onAfterMessage: async (event: EvmResult, next?: Next) => {
        if (traceTx) await this.callTracer.register(event);
        next?.();
      },
    });
    await this.callTracer.process();
    if (contractTxResult.errors) {
      if (traceTx) this.callTracer.save(contractTxResult.txHash!, 'failed');
    } else {
      if (traceTx) this.callTracer.save(contractTxResult.txHash!, 'success');
    }

    return contractTxResult;
  }

  getContract<ContractFqnT extends keyof LensArtifactsMapT & string>(address: Hex, contractFQN: ContractFqnT) {
    const contractAbi = this.debugMetadata.artifacts.getArtifactAbi(
      contractFQN
    ) as LensArtifactsMapT[ContractFqnT]['abi'];
    if (!contractAbi) throw new InvalidArgument(`Artifact for ${contractFQN} not found.`);

    return getContract({
      address: address,
      abi: contractAbi,
      client: this.client,
    });
  }

  async revert() {
    // TODO: snapshots are not supported by tevm yet, so there is complete reset
    this.client = await buildClient(this.deployerAccount);
  }
}
