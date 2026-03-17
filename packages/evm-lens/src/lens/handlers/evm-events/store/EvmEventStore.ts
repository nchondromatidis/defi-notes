import type { Address } from '../../../types.ts';
import {
  type EvmEvent,
  isExternalCallEvmEvent,
  isExternalCallResultEvmEvent,
  isOpcodeStepEvent,
} from '../events/evm-events.ts';
import { EventsHandlerBase } from '../../EventsHandlerBase.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../../../_common/debug.ts';
import { InvariantError } from '../../../../_common/errors.ts';
import type { EvmStoreEntry, ExternalCallStoreEntry, OpcodeStoreEntry } from './evm-store-entry.ts';
import { debugLogEvmEvents } from './_debug.ts';

const debug = createDebug(`${DEBUG_PREFIX}:EvmEventStore`);

export class EvmEventStore extends EventsHandlerBase {
  private evmEvents: Array<EvmStoreEntry> = [];
  private delegateCallContractAddress?: Address = undefined;

  store(evmEvent: EvmEvent) {
    switch (true) {
      case isExternalCallEvmEvent(evmEvent): {
        this.delegateCallContractAddress = evmEvent.delegatecall ? evmEvent._codeAddress : undefined;
        const event: ExternalCallStoreEntry = { _type: 'ExternalCall', evmEvent };

        this.evmEvents.push(event);
        debugLogEvmEvents(debug, event);

        break;
      }
      case isExternalCallResultEvmEvent(evmEvent): {
        this.delegateCallContractAddress = undefined;
        const event: ExternalCallStoreEntry = { _type: 'ExternalCall', evmEvent };

        this.evmEvents.push(event);
        debugLogEvmEvents(debug, event);

        break;
      }
      case isOpcodeStepEvent(evmEvent): {
        const contractAddress = this.delegateCallContractAddress ?? evmEvent.to;
        const contractFQN = this.addressLabeler.getContractFqnForAddress(contractAddress);
        if (!contractFQN) {
          debug('ContractFQN not found for event, skipping...', { pc: evmEvent.pc });
          break;
        }

        const functionIndex = this.debugMetadata.pcLocations.getFunctionIndex(contractFQN, evmEvent.pc);
        const pcLocationIndex = this.debugMetadata.pcLocations.getPcLocationIndex(contractFQN, evmEvent.pc);

        if (functionIndex && pcLocationIndex) {
          const event: OpcodeStoreEntry = { _type: 'Opcode', evmEvent, functionIndex, pcLocationIndex };
          this.evmEvents.push(event);
          debugLogEvmEvents(debug, event);
        }

        debug('functionIndex or pcLocationIndex not found for event, skipping...', { pc: evmEvent.pc });

        break;
      }
      default:
        throw new InvariantError('Event mapping not supported', evmEvent);
    }
  }

  getEvmEvents(): ReadonlyArray<EvmStoreEntry> {
    return this.evmEvents;
  }

  reset() {
    this.evmEvents = [];
  }
}
