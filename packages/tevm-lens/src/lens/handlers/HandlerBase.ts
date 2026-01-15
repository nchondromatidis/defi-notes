import { DebugMetadata } from '../indexes/DebugMetadata.ts';
import { AddressLabeler } from '../indexes/AddressLabeler.ts';

export abstract class HandlerBase {
  constructor(
    protected readonly debugMetadata: DebugMetadata,
    protected readonly addressLabeler: AddressLabeler
  ) {}
}
