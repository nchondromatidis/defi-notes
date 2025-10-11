import type { Hex } from '../common/utils.ts';
import { SupportedContracts } from './SupportedContracts.ts';
import { LabeledContracts } from './LabeledContracts.ts';
import type { ContractResult, Message, NewContractEvent } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import type { Address } from 'tevm';
import { bytesToHex, decodeFunctionData, toHex } from 'viem';
import { InvariantError } from '../common/errors.ts';

// CONSIDER: discriminate types
type TraceMessage = Message & {
  type: 'TraceMessage';
  contractFQN?: string;
  functionName?: string;
  args?: readonly unknown[];
  isDeployed?: boolean;
  cratedAddress?: Address;
  cratedContractFQN?: string;
};
type TraceContractResult = EvmResult & { type: 'TraceContractResult' };
type TraceEvent = TraceMessage | TraceContractResult;
type TxTrace = Array<TraceEvent>;

export class Tracer {
  public readonly traced: Map<Hex, TxTrace> = new Map();
  public readonly tracing: Map<string, TxTrace> = new Map();

  constructor(
    private readonly supportedContracts: SupportedContracts,
    private readonly labeledContracts: LabeledContracts
  ) {}

  // EVENT HANDLERS

  public async handleFunctionCall(message: Message, tempId: string): Promise<void> {
    const traceMessage: TraceMessage = { ...message, type: 'TraceMessage' };

    if (!message.to) {
      this.addToTrace(tempId, traceMessage);
      return;
    }

    const contractFQN = this.labeledContracts.getLabelForAddress(message.to.toString());
    if (!contractFQN) {
      this.addToTrace(tempId, traceMessage);
      return;
    }

    const contractArtifact = await this.supportedContracts.getArtifactFrom(contractFQN);
    const decoded = decodeFunctionData({
      abi: contractArtifact.abi,
      data: toHex(message.data),
    });
    traceMessage.contractFQN = contractFQN;
    traceMessage.functionName = decoded.functionName;
    traceMessage.args = decoded.args;

    this.addToTrace(tempId, traceMessage);
  }

  public async handleNewContract(event: NewContractEvent, tempId: string) {
    // preconditions
    const lastEvent = this.getLastEvent(tempId);
    if (!lastEvent) throw new InvariantError('New contract as fist event');
    if (lastEvent.type !== 'TraceMessage') {
      throw new InvariantError('New contract created before function call');
    }
    if (lastEvent.type === 'TraceMessage' && lastEvent.to !== undefined) {
      throw new InvariantError('New contract, function call has no empty address');
    }

    lastEvent.isDeployed = true;
    lastEvent.cratedAddress = event.address.toString();

    const contractFQN = await this.supportedContracts.getContractFqnFrom(bytesToHex(event.code));
    if (contractFQN) {
      this.labeledContracts.labelAddress(event.address.toString(), contractFQN, true);
      lastEvent.cratedContractFQN = contractFQN;
    }
  }

  public async handleFunctionReturn(event: EvmResult, tempId: string) {
    // TODO: continue here
    // error
    // success
    // logs
    // events
    return;
  }

  async handleTxFinished(result: ContractResult, tempId: string) {
    // preconditions
    if (!result.txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracing.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.traced.set(result.txHash, currentTxTrace);
  }

  // HELPER FUNCTIONS

  private getLastEvent(tempId: string) {
    const txTrace = this.tracing.get(tempId);
    if (!txTrace) return undefined;
    return txTrace[txTrace.length - 1];
  }

  private addToTrace(tempId: string, traceMessage: TraceMessage): void {
    const txTrace = this.tracing.get(tempId) ?? [];
    txTrace.push(traceMessage);
    this.tracing.set(tempId, txTrace);
  }
}
