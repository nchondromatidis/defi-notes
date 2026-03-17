import { buildClient } from '../adapters/client.ts';
import { ArtifactsProvider } from './indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from './indexes/FunctionIndexesRegistry.ts';
import { DebugMetadata } from './indexes/DebugMetadata.ts';
import { AddressLabeler } from './indexes/AddressLabeler.ts';
import { ExternalCallHandler } from './handlers/function-call-events/handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from './handlers/function-call-events/handlers/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from './handlers/function-call-events/handlers/FunctionEntryHandler.ts';
import { FunctionExitHandler } from './handlers/function-call-events/handlers/FunctionExitHandler.ts';
import { FunctionTracer } from './handlers/FunctionTracer.ts';
import { LensClient } from './LensClient.ts';
import type { LensArtifactsMap } from './types.ts';
import { PcLocationIndexesRegistry } from './indexes/PcLocationIndexesRegistry.ts';
import { EvmEventHandler } from './handlers/evm-events/handler/EvmEventHandler.ts';
import { EvmEventStore } from './handlers/evm-events/store/EvmEventStore.ts';
import { FunctionCallEventHandler } from './handlers/function-call-events/FunctionCallEventHandler.ts';
import type { Account } from 'viem';
import { TevmEventsAdapter } from './handlers/tevm-events/TevmEventAdapter.ts';

export async function buildCallTracer<LensArtifactsMapT extends LensArtifactsMap<any>>(defaultAccount: Account) {
  const client = await buildClient(defaultAccount);

  const artifactsProvider = new ArtifactsProvider();
  const functionIndexesRegistry = new FunctionIndexesRegistry();
  const pcLocationIndexesRegistry = new PcLocationIndexesRegistry();
  const debugMetadata = new DebugMetadata(artifactsProvider, functionIndexesRegistry, pcLocationIndexesRegistry);

  const addressLabeler = new AddressLabeler();
  // call trace event handlers
  const externalCallHandler = new ExternalCallHandler(debugMetadata, addressLabeler);
  const externalCallResultHandler = new ExternalCallResultHandler(debugMetadata, addressLabeler);
  const functionEntryHandler = new FunctionEntryHandler(debugMetadata, addressLabeler);
  const functionExitHandler = new FunctionExitHandler(debugMetadata, addressLabeler);
  const functionCallEventHandler = new FunctionCallEventHandler(
    externalCallHandler,
    externalCallResultHandler,
    functionEntryHandler,
    functionExitHandler
  );
  // evm events handlers
  const tevmEventsAdapter = new TevmEventsAdapter();
  const evmEventStore = new EvmEventStore(debugMetadata, addressLabeler);
  const evmEventHandler = new EvmEventHandler(debugMetadata, addressLabeler);

  const functionTracer = new FunctionTracer(
    tevmEventsAdapter,
    evmEventStore,
    evmEventHandler,
    functionCallEventHandler
  );

  const lensClient = new LensClient<LensArtifactsMapT>(
    defaultAccount,
    client,
    debugMetadata,
    addressLabeler,
    functionTracer
  );

  return {
    defaultAccount,
    client,
    artifactsProvider,
    functionIndexesRegistry,
    debugMetadata,
    addressLabeler,
    externalCallHandler,
    externalCallResultHandler,
    functionEntryHandler,
    functionExitHandler,
    functionTracer,
    lensClient,
  };
}
