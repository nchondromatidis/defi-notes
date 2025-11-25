import { SupportedContracts } from '../../indexes/SupportedContracts.ts';
import { DeployedContracts } from '../../indexes/DeployedContracts.ts';
import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { type Abi, bytesToHex } from 'viem';
import { InvariantError } from '../../../common/errors.ts';
import { type FunctionCallEvent, type FunctionResultEvent, LensCallTracerResult } from './LensCallTracerResult.ts';
import { type Address, type Hex, type LensArtifactsMap } from '../../types/artifact.ts';
import { decodeFunctionCallMultipleAbis, decodeFunctionResult, decodeLog } from './decoders.ts';

export class LensCallTracer<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public readonly tracingTxs: Map<string, LensCallTracerResult> = new Map();

  public readonly succeededTxs: Map<Hex, LensCallTracerResult> = new Map();
  public readonly failedTxs: Map<string, LensCallTracerResult> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts,
    private readonly deployedContracts: DeployedContracts
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

    // base function call object
    const callData = bytesToHex(callEvent.data);
    const functionCallEvent: FunctionCallEvent = {
      type: 'FunctionCallEvent',
      to: callEvent?.to?.toString(),
      from: callEvent.caller.toString(),
      depth: callEvent.depth,
      rawData: callData,
      value: callEvent.value,
      isDelegateCall: callEvent.delegatecall,
      callType: 'UNKNOWN',
      precompile: callEvent.isCompiled,
    };

    let bytecode = undefined;
    const abisRelatedToCalledContract: Array<{ contractFQN: string | undefined; abi: Abi | undefined }> = [];

    // new contract
    if (!callEvent.to) {
      functionCallEvent.callType = 'CREATE';
      if (callEvent.salt) functionCallEvent.callType = 'CREATE2';
      functionCallEvent.create2Salt = callEvent.salt ? bytesToHex(callEvent.salt) : undefined;
      const result = this.supportedContracts.getContractFqnFromCallData(callData);
      bytecode = result.bytecode;
      functionCallEvent.createdContractFQN = result.newContractFQN;
    }

    // function call
    if (callEvent.to) {
      functionCallEvent.callType = 'CALL';
      if (callEvent.isStatic) functionCallEvent.callType = 'STATICCALL';
      const contractFQN = this.deployedContracts.getContractFqnForAddress(callEvent.to.toString());
      functionCallEvent.contractFQN = contractFQN;
      const { contractAbi, linkLibraries } = this.supportedContracts.getAllAbisRelatedTo(contractFQN);
      // called contract
      abisRelatedToCalledContract.push({ contractFQN, abi: contractAbi });
      // called contract external libraries
      for (const linkLibrary of linkLibraries) {
        abisRelatedToCalledContract.push({ contractFQN: linkLibrary.fqn, abi: linkLibrary.abi });
      }
    }

    // function delegate call
    if (callEvent.to && callEvent.delegatecall) {
      functionCallEvent.callType = 'DELEGATECALL';
      // callEvent type missing _codeAddress, but implementation has it
      const codeAddress = (callEvent as any)['_codeAddress'].toString() as Address;
      if (!codeAddress) throw new InvariantError('codeAddress is empty', { callEvent, functionCallEvent });

      // delegate call implementation contract
      const implContractFQN = this.deployedContracts.getContractFqnForAddress(codeAddress);
      functionCallEvent.implContractFQN = implContractFQN;
      functionCallEvent.implAddress = codeAddress;

      const implAbi = this.supportedContracts.getArtifactAbi(implContractFQN);
      abisRelatedToCalledContract.push({ contractFQN: implContractFQN, abi: implAbi });
    }

    // decode called function: name, type, args
    const decodedFunctionCall = decodeFunctionCallMultipleAbis({
      contractsAndAbis: abisRelatedToCalledContract,
      data: callData,
      precompile: functionCallEvent.precompile,
      value: callEvent.value,
      createdBytecode: bytecode,
    });

    if (decodedFunctionCall) {
      functionCallEvent.functionName = decodedFunctionCall.decodedFunctionName;
      functionCallEvent.functionType = decodedFunctionCall.type;
      functionCallEvent.args = decodedFunctionCall.decodedArgs;

      const sourceLocation = this.supportedContracts.getFunctionCallLocation(
        decodedFunctionCall.contractFQN,
        decodedFunctionCall.decodedFunctionName,
        decodedFunctionCall.type
      );
      functionCallEvent.lineStart = sourceLocation?.lineStart;
      functionCallEvent.lineEnd = sourceLocation?.lineEnd;
      functionCallEvent.source = sourceLocation?.source;
    }

    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);

    // function call that led to this result
    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();
    const contractFQN = functionCallEvent.contractFQN;
    const functionName = functionCallEvent.functionName;

    // function result object
    const functionResultEvent: FunctionResultEvent = {
      type: 'FunctionResultEvent',
    };
    const returnValueHex = bytesToHex(resultEvent.execResult.returnValue);
    functionResultEvent.returnValueRaw = returnValueHex;

    // case: new contract deployment
    if (resultEvent.createdAddress) {
      functionResultEvent.isCreate = true;
      functionResultEvent.createdAddress = resultEvent.createdAddress.toString();
      const createdContractFQN = tempIdTxTrace.getCurrentFunctionCallEvent().createdContractFQN;
      if (createdContractFQN) {
        functionResultEvent.createdContractFQN = createdContractFQN;
        this.deployedContracts.markContractAddress(resultEvent.createdAddress.toString(), createdContractFQN);
      }
    }

    // case: function result
    let abi = undefined;
    if (contractFQN) abi = this.supportedContracts.getArtifactAbi(contractFQN);

    functionResultEvent.isError = false;
    if (!resultEvent.createdAddress && resultEvent.execResult.exceptionError) {
      functionResultEvent.isError = true;
      functionResultEvent.rawError = resultEvent.execResult.exceptionError;
    }

    if (abi && functionName) {
      const decodedResult = decodeFunctionResult({
        abi: abi,
        data: returnValueHex,
        isError: functionResultEvent.isError,
      });
      if (decodedResult && !decodedResult.isSuccess) {
        functionResultEvent.errorName = decodedResult.decodedError.errorName;
        functionResultEvent.errorArgs = decodedResult.decodedError.args;
        functionResultEvent.errorAbiItem = decodedResult.decodedError.abiItem;
      }
      if (decodedResult && decodedResult.isSuccess) {
        functionResultEvent.returnValue = decodedResult.decodedFunctionResult;
      }
    }

    // case: constructor/fallback/receive: do not need decoding

    // logs
    if (abi && resultEvent.execResult.logs) {
      const logAbis = resultEvent.execResult.logs.map((it) => {
        const logContractAddress = bytesToHex(it[0]);

        const logAbiContractAddress = functionCallEvent.isDelegateCall ? functionCallEvent.to : logContractAddress;
        if (!logAbiContractAddress) return undefined;

        const logContractFQN = this.deployedContracts.getContractFqnForAddress(logAbiContractAddress);
        if (!logContractFQN) return;
        const logContractAbi = this.supportedContracts.getArtifactAbi(logContractFQN);

        return { log: it, logContractAbi, logContractFQN };
      });
      functionResultEvent.logs = logAbis
        .map((it) => {
          if (!it) return undefined;
          const decoded = decodeLog(it.log, it.logContractAbi);
          return {
            ...decoded,
            contractFQN: it.logContractFQN,
          };
        })
        .filter((it) => it !== undefined);
    }

    tempIdTxTrace.addResult(functionResultEvent);
  }

  //** Helper Functions **/

  private getTracingTx(tempId: string) {
    if (!this.tracingTxs.has(tempId)) {
      throw new InvariantError('getTracingTx called without startTxTrace');
    }
    return this.tracingTxs.get(tempId)!;
  }
}
