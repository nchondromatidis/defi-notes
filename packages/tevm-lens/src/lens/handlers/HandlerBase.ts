import { DebugMetadata } from '../indexes/DebugMetadata.ts';
import { DeploymentTracer } from '../callTracer/DeploymentTracer.ts';

export abstract class HandlerBase {
  constructor(
    protected readonly debugMetadata: DebugMetadata,
    protected readonly deployedContracts: DeploymentTracer
  ) {}
}
