import { type ContractFunctionName, tevmContract, tevmDeploy, tevmSetAccount, type TevmTransport } from 'tevm';
import {
  type Abi,
  type AbiStateMutability,
  type Account,
  type ContractConstructorArgs,
  type ContractFunctionArgs,
  getContract,
} from 'viem';
import type { Message } from 'tevm/actions';
import type { EvmResult, InterpreterStep } from 'tevm/evm';
import { AddressLabeler } from './indexes/AddressLabeler.ts';
import { InvalidArgument, InvariantError } from '../_common/errors.ts';
import type { Address, Hex, LensArtifactsMap } from './types.ts';
import { hardhatLinkExternalLibToBytecode } from './utils/hardhat-utils.ts';
import { buildClient, type PublicTestClient } from '../adapters/client.ts';
import type { IResourceLoader } from './_ports/IResourceLoader.ts';
import type { ReadOnlyFunctionCallEvent } from './pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { logger } from '../_common/logger.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../_common/debug.ts';
import { ArtifactsProvider } from './indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from './indexes/FunctionIndexesRegistry.ts';
import { PcLocationIndexesRegistry } from './indexes/PcLocationIndexesRegistry.ts';
import type { SourceMapper } from './source-map/SourceMapper.ts';
import type { FunctionTracePipeline } from './pipeline/FunctionTracePipeline.ts';

export type Next = () => void;

const debug = createDebug(`${DEBUG_PREFIX}:LensClient`);

export class LensClient<
  ArtifactMapT extends object,
  in out LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT> = LensArtifactsMap<ArtifactMapT>,
> {
  constructor(
    public defaultAccount: Account,
    public client: PublicTestClient<TevmTransport>,
    public readonly artifacts: ArtifactsProvider,
    public readonly functions: FunctionIndexesRegistry,
    public readonly pcLocations: PcLocationIndexesRegistry,
    public readonly addressLabeler: AddressLabeler,
    public readonly sourceMapper: SourceMapper,
    public readonly functionTracePipeline: FunctionTracePipeline
  ) {}

  // tracing functions

  async deploy<ContractFQNT extends keyof LensArtifactsMapT & string>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<LensArtifactsMapT[ContractFQNT]['abi']>,
    librariesToLink: Array<{ libFQN: ContractFQNT; address: Address }> = [],
    from?: Address
  ) {
    const artifact = this.artifacts.getArtifactFrom(contractFQN);
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
  ): Promise<ReadOnlyFunctionCallEvent | undefined> {
    if (traceTx) this.functionTracePipeline.reset();
    debug('Contract called', { functionName, traceTx });
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
      onStep: (event: InterpreterStep, next?: Next) => {
        if (traceTx) this.functionTracePipeline.process(event);
        next?.();
      },
      onBeforeMessage: (event: Message, next?: Next) => {
        if (traceTx) this.functionTracePipeline.process(event);
        next?.();
      },
      onAfterMessage: (event: EvmResult, next?: Next) => {
        if (traceTx) this.functionTracePipeline.process(event);
        next?.();
      },
    });

    if (contractTxResult.errors) {
      logger.error('TX Reverted', { errors: contractTxResult.errors });
    }

    return traceTx ? await this.functionTracePipeline.flush() : undefined;
  }

  // helper functions

  getContract<ContractFqnT extends keyof LensArtifactsMapT & string>(address: Hex, contractFQN: ContractFqnT) {
    const contractAbi = this.artifacts.getArtifactAbi(contractFQN) as LensArtifactsMapT[ContractFqnT]['abi'];
    if (!contractAbi) throw new InvalidArgument(`Artifact for ${contractFQN} not found.`);

    return getContract({
      address: address,
      abi: contractAbi,
      client: this.client,
    });
  }

  async registerIndexes(resourceLoader: IResourceLoader, protocolName: string) {
    const artifacts = await resourceLoader.getProtocolArtifacts(protocolName);
    await this.artifacts.register(artifacts);

    const functionIndexes = await resourceLoader.getFunctionIndexes(protocolName);
    await this.functions.register(functionIndexes);
    await this.sourceMapper.register(functionIndexes);

    const pcLocationIndexes = await resourceLoader.getPcLocationIndexes(protocolName);
    await this.pcLocations.register(functionIndexes, pcLocationIndexes);
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
    this.artifacts.reset();
    this.functions.reset();
    this.pcLocations.reset();
    this.sourceMapper.reset();
    this.functionTracePipeline.reset();
  }
}
