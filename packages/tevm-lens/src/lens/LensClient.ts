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
import { DebugMetadata } from './indexes/DebugMetadata.ts';
import { AddressLabeler } from './indexes/AddressLabeler.ts';
import { TxTracer } from './tx-tracer/TxTracer.ts';
import { InvalidArgument, InvariantError } from '../common/errors.ts';
import type { Address, Hex, LensArtifactsMap, LensProjects } from './types/artifact.ts';
import type { InterpreterStep } from 'tevm/evm';
import { hardhatLinkExternalLibToBytecode } from '../utils/hardhat.ts';

export type Next = () => void;

export class LensClient<
  ArtifactMapT extends object,
  ProjectsT extends LensProjects,
  ProjectT extends ProjectsT,
  RootT extends string,
  LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT, ProjectsT, ProjectT, RootT> = LensArtifactsMap<
    ArtifactMapT,
    ProjectsT,
    ProjectT,
    RootT
  >,
> {
  constructor(
    public readonly client: Client<TevmTransport>,
    public readonly debugMetadata: DebugMetadata,
    public readonly addressLabeler: AddressLabeler,
    public readonly txTracer: TxTracer
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
    const tracingId = randomId();
    if (traceTx) this.txTracer.startTracing(tracingId);
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
        if (traceTx) await this.txTracer.handleFunctionEntryHandler(event, tracingId);
        if (traceTx) await this.txTracer.handleFunctionExitHandler(event, tracingId);
        next?.();
      },
      onBeforeMessage: async (event: Message, next?: Next) => {
        if (traceTx) await this.txTracer.handleExternalCall(event, tracingId);
        next?.();
      },
      onAfterMessage: async (event: EvmResult, next?: Next) => {
        if (traceTx) await this.txTracer.handleExternalCallResult(event, tracingId);
        next?.();
      },
    });
    if (contractTxResult.errors) {
      if (traceTx) this.txTracer.stopTracing(contractTxResult.txHash!, tracingId, 'failed');
    } else {
      if (traceTx) this.txTracer.stopTracing(contractTxResult.txHash!, tracingId, 'success');
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
}
