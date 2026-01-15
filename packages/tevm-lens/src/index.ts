import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildClient } from './adapters/client.ts';
import { ArtifactsProvider } from './lens/indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from './lens/indexes/FunctionIndexesRegistry.ts';
import { DebugMetadata } from './lens/indexes/DebugMetadata.ts';
import { AddressLabeler } from './lens/indexes/AddressLabeler.ts';
import { ExternalCallHandler } from './lens/handlers/trace-events/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from './lens/handlers/trace-events/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from './lens/handlers/trace-events/FunctionEntryHandler.ts';
import { FunctionExitHandler } from './lens/handlers/trace-events/FunctionExitHandler.ts';
import { CallTracer } from './lens/CallTracer.ts';
import { LensClient } from './adapters/LensClient.ts';
import type { LensArtifactsMap } from './lens/types.ts';
import { PcLocationIndexesRegistry } from './lens/indexes/PcLocationIndexesRegistry.ts';
import { FunctionCallMatcher } from './lens/handlers/pattern-matchers/FunctionCallMatcher.ts';

export async function buildCallTracer<
  ArtifactMapT extends object,
  LensArtifactsMapT extends LensArtifactsMap<ArtifactMapT> = LensArtifactsMap<ArtifactMapT>,
>() {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const client = await buildClient(deployerAccount);

  const artifactsProvider = new ArtifactsProvider();
  const functionIndexesRegistry = new FunctionIndexesRegistry();
  const pcLocationIndexesRegistry = new PcLocationIndexesRegistry();
  const debugMetadata = new DebugMetadata(artifactsProvider, functionIndexesRegistry, pcLocationIndexesRegistry);

  const addressLabeler = new AddressLabeler();
  const externalCallHandler = new ExternalCallHandler(debugMetadata, addressLabeler);
  const externalCallResultHandler = new ExternalCallResultHandler(debugMetadata, addressLabeler);
  const functionEntryHandler = new FunctionEntryHandler(debugMetadata, addressLabeler);
  const functionExitHandler = new FunctionExitHandler(debugMetadata, addressLabeler);
  const functionCallMatcher = new FunctionCallMatcher(debugMetadata, addressLabeler);

  const tracer = new CallTracer(
    externalCallHandler,
    externalCallResultHandler,
    functionEntryHandler,
    functionExitHandler,
    functionCallMatcher
  );

  const lensClient = new LensClient<LensArtifactsMapT>(client, debugMetadata, addressLabeler, tracer);

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
