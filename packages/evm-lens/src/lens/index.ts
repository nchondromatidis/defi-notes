import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildClient } from '../adapters/client.ts';
import { ArtifactsProvider } from './indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from './indexes/FunctionIndexesRegistry.ts';
import { DebugMetadata } from './indexes/DebugMetadata.ts';
import { AddressLabeler } from './indexes/AddressLabeler.ts';
import { ExternalCallHandler } from './handlers/call-trace-event-handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from './handlers/call-trace-event-handlers/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from './handlers/call-trace-event-handlers/FunctionEntryHandler.ts';
import { FunctionExitHandler } from './handlers/call-trace-event-handlers/FunctionExitHandler.ts';
import { CallTracer } from './call-tracer/CallTracer.ts';
import { LensClient } from './LensClient.ts';
import type { LensArtifactsMap } from './types.ts';
import { PcLocationIndexesRegistry } from './indexes/PcLocationIndexesRegistry.ts';
import { OpcodeMatcher } from './handlers/evm-events-handlers/OpcodeMatcher.ts';
import { EvmEventsHandler } from './handlers/EvmEventsHandler.ts';
import { EventStore } from './handlers/evm-events-handlers/EventStore.ts';
import { CallTraceEventHandler } from './handlers/CallTraceEventHandler.ts';

export async function buildCallTracer<LensArtifactsMapT extends LensArtifactsMap<any>>() {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const client = await buildClient(deployerAccount);

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
  const callTraceEventHandler = new CallTraceEventHandler(
    externalCallHandler,
    externalCallResultHandler,
    functionEntryHandler,
    functionExitHandler
  );
  // evm events handlers
  const eventStore = new EventStore(debugMetadata, addressLabeler);
  const opcodeMatcher = new OpcodeMatcher(debugMetadata, addressLabeler);
  const evmEventsHandler = new EvmEventsHandler(eventStore, opcodeMatcher);

  const tracer = new CallTracer(evmEventsHandler, callTraceEventHandler);

  const lensClient = new LensClient<LensArtifactsMapT>(deployerAccount, client, debugMetadata, addressLabeler, tracer);

  return {
    deployerAccount,
    client,
    artifactsProvider,
    functionIndexesRegistry,
    debugMetadata,
    addressLabeler,
    externalCallHandler,
    externalCallResultHandler,
    functionEntryHandler,
    functionExitHandler,
    tracer,
    lensClient,
  };
}
