import type { EvmEvent } from '../evm-events.ts';
import type { Address } from '../../../types.ts';
import type { PcLocationIndexesRegistry } from '../../../indexes/PcLocationIndexesRegistry.ts';
import type { AddressLabeler } from '../../../indexes/AddressLabeler.ts';
import { debugLog } from './_debugLog.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../../../_common/debug.ts';
import type { EnrichedEvmEvent, EnrichedExternalCallEvent, EnrichedOpcodeEvent } from './enriched-evm-events.ts';

const debug = createDebug(`${DEBUG_PREFIX}:enriched-evm-event`);

export class EnrichEvmEventStage {
  public readonly name = 'EnrichStage';

  private delegateCallContractAddress: Address | undefined;

  constructor(
    private pcLocationIndexes: PcLocationIndexesRegistry,
    private addressLabeler: AddressLabeler
  ) {}

  process(event: EvmEvent): EnrichedEvmEvent | undefined {
    switch (event._type) {
      case 'ExternalCallEvmEvent': {
        this.delegateCallContractAddress = event.delegatecall ? event._codeAddress : undefined;
        const enrichedEvmEvent: EnrichedExternalCallEvent = { _type: 'ExternalCall', evmEvent: event };
        debugLog(debug, enrichedEvmEvent);
        return enrichedEvmEvent;
      }
      case 'ExternalCallResultEvmEvent': {
        this.delegateCallContractAddress = undefined;
        const enrichedEvmEvent: EnrichedExternalCallEvent = { _type: 'ExternalCall', evmEvent: event };
        debugLog(debug, enrichedEvmEvent);
        return enrichedEvmEvent;
      }
      case 'OpcodeStep': {
        const contractAddress = this.delegateCallContractAddress ?? event.to;
        const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);

        if (!contractFQN) {
          return undefined;
        }

        const functionIndex = this.pcLocationIndexes.getFunctionIndex(contractFQN, event.pc);
        const pcLocationIndex = this.pcLocationIndexes.getPcLocationIndex(contractFQN, event.pc);

        if (functionIndex && pcLocationIndex) {
          const enrichedEvmEvent: EnrichedOpcodeEvent = {
            _type: 'Opcode',
            evmEvent: event,
            functionIndex,
            pcLocationIndex,
          };
          debugLog(debug, enrichedEvmEvent);
          return enrichedEvmEvent;
        }
        return undefined;
      }
    }
  }

  reset(): void {
    this.delegateCallContractAddress = undefined;
  }
}
