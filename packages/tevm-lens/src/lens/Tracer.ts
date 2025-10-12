import type { Hex } from '../common/utils.ts';
import { SupportedContracts } from './SupportedContracts.ts';
import { DeployedContracts } from './DeployedContracts.ts';
import type { ContractResult, Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { bytesToHex, decodeFunctionData, toHex } from 'viem';
import { InvariantError } from '../common/errors.ts';

// CONSIDER: discriminate types
type FunctionCallEvent = Message & {
  type: 'FunctionCallEvent';
  contractFQN?: string;
  functionName?: string;
  args?: readonly unknown[];
  isCreate?: boolean;
  createdContractFQN?: string;
  constructorArgs?: readonly unknown[];
};
type FunctionResultEvent = EvmResult & {
  type: 'FunctionResultEvent';
  createdContractFQN?: string;
};
type TraceEvent = FunctionCallEvent | FunctionResultEvent;
type TxTrace = Array<TraceEvent>;

export class Tracer {
  public readonly tracedTx: Map<Hex, TxTrace> = new Map();
  public readonly tracingTx: Map<string, TxTrace> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts,
    private readonly deployedContracts: DeployedContracts
  ) {}

  // EVENT HANDLERS

  public async handleFunctionCall(event: Message, tempId: string): Promise<void> {
    const functionCallEvent: FunctionCallEvent = { ...event, type: 'FunctionCallEvent' };

    // new contract deployment
    if (!event.to) {
      functionCallEvent.isCreate = true;
      const hexBytecode = bytesToHex(event.data);
      const contractFQN = await this.supportedContracts.getContractFqnFromBytecode(hexBytecode);
      if (contractFQN) {
        functionCallEvent.createdContractFQN = contractFQN;
        const contractArtifact = await this.supportedContracts.getArtifactFrom(contractFQN);
        const constructorCode = contractArtifact.bytecode.slice(hexBytecode.length) as Hex;
        if (constructorCode.length === 0) {
          functionCallEvent.constructorArgs = [];
        } else {
          const decodedNew = decodeFunctionData({
            abi: contractArtifact.abi,
            data: constructorCode,
          });
          functionCallEvent.constructorArgs = decodedNew.args;
        }
      }
      this.addToTrace(tempId, functionCallEvent);
      return;
    }

    // function call/send
    const contractFQN = this.deployedContracts.getContractForAddress(event.to.toString());
    if (contractFQN) {
      const contractArtifact = await this.supportedContracts.getArtifactFrom(contractFQN);
      const decoded = decodeFunctionData({
        abi: contractArtifact.abi,
        data: toHex(event.data),
      });
      functionCallEvent.contractFQN = contractFQN;
      functionCallEvent.functionName = decoded.functionName;
      functionCallEvent.args = decoded.args;
    }
    this.addToTrace(tempId, functionCallEvent);
  }

  public async handleFunctionResult(event: EvmResult, tempId: string) {
    // TODO: continue here
    const functionResultEvent: FunctionResultEvent = { ...event, type: 'FunctionResultEvent' };

    // new contract deployment
    if (functionResultEvent.createdAddress) {
      const deployedByteCode = event.execResult.returnValue;
      if (!deployedByteCode) throw new InvariantError('DeployedByteCode missing');
      console.log(bytesToHex(deployedByteCode));
      const contractFQN = await this.supportedContracts.getContractFqnFromDeployedBytecode(
        bytesToHex(deployedByteCode)
      );
      if (contractFQN) {
        this.deployedContracts.markContractAddress(functionResultEvent.createdAddress.toString(), contractFQN);
        functionResultEvent.createdContractFQN = contractFQN;
      }
      this.addToTrace(tempId, functionResultEvent);
      return;
    }
    this.addToTrace(tempId, functionResultEvent);

    // success
    // error

    // logs
    // events
    return;
  }

  async handleTxFinished(result: ContractResult, tempId: string) {
    // preconditions
    if (!result.txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracingTx.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.tracedTx.set(result.txHash, currentTxTrace);
  }

  // HELPER FUNCTIONS

  private addToTrace(tempId: string, traceMessage: TraceEvent): void {
    const txTrace = this.tracingTx.get(tempId) ?? [];
    txTrace.push(traceMessage);
    this.tracingTx.set(tempId, txTrace);
  }
}
