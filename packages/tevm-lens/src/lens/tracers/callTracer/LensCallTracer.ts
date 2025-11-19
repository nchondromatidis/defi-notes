import { SupportedContracts } from '../../indexes/SupportedContracts.ts';
import { DeployedContracts } from '../../indexes/DeployedContracts.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { bytesToHex } from 'viem';
import { InvariantError } from '../../../common/errors.ts';
import { type FunctionCallEvent, type FunctionResultEvent, LensCallTracerResult } from './LensCallTracerResult.ts';
import { type Hex, type LensArtifactsMap } from '../../types/artifact.ts';
import { decodeFunctionCall, decodeFunctionResult, decodeLog } from './decoders.js';

export class LensCallTracer<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public readonly tracingTxs: Map<string, LensCallTracerResult<ArtifactMapT>> = new Map();
  public readonly succeededTxs: Map<Hex, LensCallTracerResult<ArtifactMapT>> = new Map();
  public readonly failedTxs: Map<string, LensCallTracerResult<ArtifactMapT>> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts<ArtifactMapT>,
    private readonly deployedContracts: DeployedContracts<ArtifactMapT>
  ) {}

  //** Start-Stop tracing **/

  public startTracing(tempId: string) {
    const txTrace = new LensCallTracerResult();
    this.tracingTxs.set(tempId, txTrace);
  }

  public stopTracingSuccess(txHash: Hex | undefined, tempId: string) {
    if (!txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.succeededTxs.set(txHash, currentTxTrace);
  }

  public stopTracingFailed(txHash: string, tempId: string) {
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.failedTxs.set(txHash, currentTxTrace);
  }

  //** Event Handlers **/

  public async handleFunctionCall(callEvent: Message, tempId: string): Promise<void> {
    const tempIdTxTrace = this.getTracingTx(tempId);
    const functionCallEvent: FunctionCallEvent<ArtifactMapT> = {
      type: 'FunctionCallEvent',
      to: callEvent?.to?.toString(),
    };

    functionCallEvent.depth = callEvent.depth;
    const callData = bytesToHex(callEvent.data);

    let bytecode = undefined;
    let contractFQN = undefined;

    if (!callEvent.to) {
      functionCallEvent.isCreate = true;
      ({ bytecode, contractFQN } = this.supportedContracts.getContractFqnFromCallData(callData));
      functionCallEvent.createdContractFQN = contractFQN;
    }
    if (callEvent.to) {
      contractFQN = this.deployedContracts.getContractFqnForAddress(callEvent.to.toString());
      functionCallEvent.contractFQN = contractFQN;
    }

    if (contractFQN) {
      const contractArtifact = this.supportedContracts.getArtifactFrom(contractFQN);
      const decodedFunctionCall = decodeFunctionCall({
        abi: contractArtifact.abi,
        data: callData,
        createdBytecode: bytecode,
      });

      if (decodedFunctionCall) {
        functionCallEvent.functionName = decodedFunctionCall.functionName;
        functionCallEvent.functionType = decodedFunctionCall.type;
        functionCallEvent.constructorArgs = decodedFunctionCall.args;

        const sourceLocation = this.supportedContracts.getFunctionCallLocation(
          contractFQN,
          decodedFunctionCall.functionName,
          decodedFunctionCall.type
        );
        functionCallEvent.lineStart = sourceLocation?.lineStart;
        functionCallEvent.lineEnd = sourceLocation?.lineEnd;
        functionCallEvent.source = sourceLocation?.source;
      }
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    const functionResultEvent: FunctionResultEvent<ArtifactMapT> = {
      type: 'FunctionResultEvent',
    };

    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();
    let abi = undefined;
    if (functionCallEvent.contractFQN) {
      abi = this.supportedContracts.getArtifactPart(functionCallEvent.contractFQN, 'abi');
    }
    const returnValueHex = bytesToHex(resultEvent.execResult.returnValue);
    functionResultEvent.returnValueRaw = returnValueHex;

    // new contract deployment
    if (resultEvent.createdAddress) {
      functionResultEvent.isCreate = true;
      functionResultEvent.createdAddress = resultEvent.createdAddress.toString();
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    // function result
    functionResultEvent.isError = false;
    if (!resultEvent.createdAddress && resultEvent.execResult.exceptionError) {
      functionResultEvent.isError = true;
      functionResultEvent.rawError = resultEvent.execResult.exceptionError;
    }

    if (abi && functionCallEvent.functionName) {
      const decodedResult = decodeFunctionResult({
        abi: abi,
        data: returnValueHex,
        isError: functionResultEvent.isError,
      });
      if (decodedResult && !decodedResult.isSuccess) {
        functionResultEvent.errorName = decodedResult.error.errorName;
        functionResultEvent.errorArgs = decodedResult.error.args;
        functionResultEvent.errorAbiItem = decodedResult.error.abiItem;
      }
      if (decodedResult && decodedResult.isSuccess) {
        functionResultEvent.returnValue = decodedResult.functionResult;
      }
    }

    // constructor/fallback/receive: do not need decoding

    // logs
    if (abi && resultEvent.execResult.logs) {
      const logAbis = resultEvent.execResult.logs.map((it) => {
        const logContractAddress = bytesToHex(it[0]);
        const contractFQN = this.deployedContracts.getContractFqnForAddress(logContractAddress);
        const abi = contractFQN && this.supportedContracts.getArtifactPart(contractFQN, 'abi');
        return {
          log: it,
          abi: abi,
        };
      });
      functionResultEvent.logs = logAbis.map((it) => decodeLog(it.log, it.abi));
    }

    tempIdTxTrace.addResult(functionResultEvent);
  }

  // HELPER FUNCTIONS

  private getTracingTx(tempId: string) {
    if (!this.tracingTxs.has(tempId)) {
      throw new InvariantError('getTracingTx called without startTxTrace');
    }
    return this.tracingTxs.get(tempId)!;
  }
}
