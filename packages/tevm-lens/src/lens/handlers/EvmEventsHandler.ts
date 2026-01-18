import { type EvmEvent } from './_events/client-evm-events.ts';
import { EventStore } from './evm-events-handlers/EventStore.ts';
import { OpcodeMatcher } from './evm-events-handlers/OpcodeMatcher.ts';

export class EvmEventsHandler {
  constructor(
    private readonly eventsStore: EventStore,
    private readonly opcodeMatcher: OpcodeMatcher
  ) {}

  async register(event: EvmEvent) {
    this.eventsStore.store(event);
  }

  async processRegistered() {
    return await this.opcodeMatcher.matchFunctionCallOpcodeSequence(this.eventsStore.getEvmEvents());
  }

  reset() {
    this.eventsStore.reset();
    this.opcodeMatcher.reset();
  }
}
