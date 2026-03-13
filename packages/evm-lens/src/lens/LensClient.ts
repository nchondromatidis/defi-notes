import { type ContractFunctionName, tevmContract, tevmDeploy, tevmSetAccount, type TevmTransport } from 'tevm';
import {
  type Abi,
  type AbiStateMutability,
  type Account,
  type ContractConstructorArgs,
  type ContractFunctionArgs,
  getContract,
} from 'viem';
import type { ContractResult, Message } from 'tevm/actions';
import type { EvmResult, InterpreterStep } from 'tevm/evm';
import { DebugMetadata } from './indexes/DebugMetadata.ts';
import { AddressLabeler } from './indexes/AddressLabeler.ts';
import { FunctionTracer } from './handlers/FunctionTracer.ts';
import { InvalidArgument, InvariantError } from '../_common/errors.ts';
import type { Address, Hex, LensArtifactsMap } from './types.ts';
import { hardhatLinkExternalLibToBytecode } from './utils/hardhat-utils.ts';
import { buildClient, type PublicTestClient } from '../adapters/client.ts';
import type { IResourceLoader } from './_ports/IResourceLoader.ts';
import type { ReadOnlyFunctionCallEvent } from './handlers/FunctionTrace.ts';

export type Next = () => void;

export class LensClient<
  ArtifactMapT extends object,
  in out LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT> = LensArtifactsMap<ArtifactMapT>,
> {
  constructor(
    public defaultAccount: Account,
    public client: PublicTestClient<TevmTransport>,
    public readonly debugMetadata: DebugMetadata,
    public readonly addressLabeler: AddressLabeler,
    public readonly functionTracer: FunctionTracer
  ) {}

  // tracing functions

  async deploy<ContractFQNT extends keyof LensArtifactsMapT & string>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<LensArtifactsMapT[ContractFQNT]['abi']>,
    librariesToLink: Array<{ libFQN: ContractFQNT; address: Address }> = [],
    from?: Address
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
      from,
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
    from?: Address,
    value?: bigint,
    traceTx = true
  ): Promise<ContractResult<TAbi, TFunctionName>> {
    if (traceTx) this.functionTracer.reset();
    const contractTxResult = await tevmContract(this.client, {
      to: contract.address,
      code: undefined,
      value,
      deployedBytecode: undefined,
      abi: contract.abi,
      functionName: functionName,
      args: args,
      throwOnFail: false,
      from,
      onStep: async (event: InterpreterStep, next?: Next) => {
        if (traceTx) await this.functionTracer.register(event);
        next?.();
      },
      onBeforeMessage: async (event: Message, next?: Next) => {
        if (traceTx) await this.functionTracer.register(event);
        next?.();
      },
      onAfterMessage: async (event: EvmResult, next?: Next) => {
        if (traceTx) await this.functionTracer.register(event);
        next?.();
      },
    });
    await this.functionTracer.process();
    if (contractTxResult.errors) {
      console.error(contractTxResult.errors);
      if (traceTx) this.functionTracer.save(contractTxResult.txHash!, 'failed');
    } else {
      if (traceTx) this.functionTracer.save(contractTxResult.txHash!, 'success');
    }

    return contractTxResult;
  }

  // view traced

  getTracedTx(contractTxResult: ContractResult): ReadOnlyFunctionCallEvent | undefined {
    const succeeded = this.getSucceeded(contractTxResult);
    const failed = this.getFailed(contractTxResult);

    if (succeeded && failed) throw new InvariantError(`Both failed and succeed trace tx registered`, contractTxResult);

    return succeeded ?? failed;
  }

  getSucceeded(contractTxResult: ContractResult): ReadOnlyFunctionCallEvent | undefined {
    if (!contractTxResult?.txHash) return undefined;

    return this.functionTracer.succeededTxs.get(contractTxResult.txHash);
  }

  getFailed(contractTxResult: ContractResult): ReadOnlyFunctionCallEvent | undefined {
    if (!contractTxResult?.txHash) return undefined;

    return this.functionTracer.failedTxs.get(contractTxResult.txHash);
  }

  // helper functions

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

  async registerIndexes(resourceLoader: IResourceLoader, protocolName: string) {
    await this.debugMetadata.register(resourceLoader, protocolName);
  }

  getContractFqnForAddress(address: Address) {
    this.addressLabeler.getContractFqnForAddress(address);
  }

  async fundAccount(address: Address, amount: bigint) {
    await tevmSetAccount(this.client, {
      address: address,
      balance: amount,
    });
  }

  // manage state

  async reset() {
    // TODO: snapshots are not supported by tevm yet, so there is complete reset
    this.client = await buildClient(this.defaultAccount);
    this.addressLabeler.reset();
    this.debugMetadata.reset();
  }
}
