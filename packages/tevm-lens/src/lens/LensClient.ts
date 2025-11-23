import { type ContractFunctionName, type TevmTransport } from 'tevm';
import { tevmContract, tevmDeploy } from 'tevm';
import {
  type Abi,
  type AbiStateMutability,
  type Client,
  type ContractConstructorArgs,
  type ContractFunctionArgs,
  getContract,
  keccak256,
  toHex,
} from 'viem';
import type { ContractResult, Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { randomId } from '../common/utils.ts';
import { SupportedContracts } from './indexes/SupportedContracts.ts';
import { DeployedContracts } from './indexes/DeployedContracts.ts';
import { LensCallTracer } from './tracers/callTracer/LensCallTracer.ts';
import { InvalidArgument, InvariantError } from '../common/errors.ts';
import type { Address, Hex, LensArtifactsMap, LensContractFQN } from './types/artifact.ts';
import type { InterpreterStep } from 'tevm/evm';

export type Next = () => void;

export class LensClient<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  constructor(
    public readonly client: Client<TevmTransport>,
    public readonly supportedContracts: SupportedContracts,
    public readonly deployedContracts: DeployedContracts,
    public readonly callDecodeTracer: LensCallTracer<ArtifactMapT>
  ) {}

  // TODO: supports only hardhat bytecode format
  private linkHardhatBytecode<ContractFQNT extends LensContractFQN<ArtifactMapT>>(
    bytecode: Hex,
    libraryFqn: ContractFQNT,
    libraryAddress: Address
  ) {
    const hash = keccak256(toHex('project/' + libraryFqn));
    const tagContent = hash.slice(2, 2 + 34);
    const tag = `__$${tagContent}$__`;

    const libraryAddressNoPrefix = libraryAddress.toLowerCase().slice(2);
    if (!bytecode.includes(tag)) {
      throw new InvalidArgument(`Library tag not found in bytecode.`, { externalLibraryFqn: libraryFqn });
    }

    return bytecode.replaceAll(tag, libraryAddressNoPrefix) as Hex;
  }

  async deploy<ContractFQNT extends LensContractFQN<ArtifactMapT>>(
    contractFQN: ContractFQNT,
    args: ContractConstructorArgs<ArtifactMapT[ContractFQNT]['abi']>,
    librariesToLink: Array<{ libFQN: ContractFQNT; address: Address }> = []
  ) {
    const artifact = this.supportedContracts.getArtifactFrom(contractFQN);
    if (!artifact) throw new InvalidArgument(`Artifact for ${contractFQN} not found.`);

    let bytecode = artifact.bytecode;
    for (const lib of librariesToLink) {
      bytecode = this.linkHardhatBytecode(bytecode, lib.libFQN, lib.address);
    }
    const deployResult = await tevmDeploy(this.client, {
      abi: artifact.abi,
      bytecode: bytecode,
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
    value?: bigint,
    traceTx = true
  ): Promise<ContractResult<TAbi, TFunctionName>> {
    const tempId = randomId();
    if (traceTx) this.callDecodeTracer.startTracing(tempId);
    const contractInteractionResult = await tevmContract(this.client, {
      to: contract.address,
      code: undefined,
      value,
      deployedBytecode: undefined,
      abi: contract.abi,
      functionName: functionName,
      args: args,
      throwOnFail: false,
      onStep: async (event: InterpreterStep, next?: Next) => {
        if (event.opcode.name == 'SSTORE') {
          // console.log(event);
        }
        next?.();
      },
      onBeforeMessage: async (event: Message, next?: Next) => {
        if (traceTx) await this.callDecodeTracer.handleFunctionCall(event, tempId);
        next?.();
      },
      onAfterMessage: async (event: EvmResult, next?: Next) => {
        if (traceTx) await this.callDecodeTracer.handleFunctionResult(event, tempId);
        next?.();
      },
    });
    if (contractInteractionResult.errors) {
      if (traceTx) this.callDecodeTracer.stopTracingFailed(tempId, tempId);
    } else {
      if (traceTx) this.callDecodeTracer.stopTracingSuccess(contractInteractionResult.txHash, tempId);
    }

    return contractInteractionResult;
  }

  async getContract<ContractFqnT extends LensContractFQN<ArtifactMapT>>(address: Hex, contractFQN: ContractFqnT) {
    const contractAbi = this.supportedContracts.getArtifactPart(contractFQN, 'abi');
    if (!contractAbi) throw new InvalidArgument(`Artifact for ${contractFQN} not found.`);

    return getContract({
      address: address,
      abi: contractAbi,
      client: this.client,
    });
  }
}
