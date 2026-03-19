import { buildClient } from '../adapters/client.ts';
import { ArtifactsProvider } from './indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from './indexes/FunctionIndexesRegistry.ts';
import { AddressLabeler } from './indexes/AddressLabeler.ts';
import { LensClient } from './LensClient.ts';
import type { LensArtifactsMap } from './types.ts';
import { PcLocationIndexesRegistry } from './indexes/PcLocationIndexesRegistry.ts';
import type { Account } from 'viem';
import { SourceMapper } from './source-map/SourceMapper.ts';
import { FunctionTracePipeline } from './pipeline/FunctionTracePipeline.ts';
import { FilterStage } from './pipeline/1_tevm-events/FilterStage.ts';
import { AdapterStage } from './pipeline/1_tevm-events/AdapterStage.ts';
import { EnrichEvmEventStage } from './pipeline/2_evm-events/jump-strategy/EnrichEvmEventStage.ts';
import { OpcodeAnalysisStage } from './pipeline/2_evm-events/jump-strategy/OpcodeAnalysisStage.ts';
import { DecodingStage } from './pipeline/3_function-call-events/DecodingStage.ts';
import { FunctionTraceBuilderStage } from './pipeline/4_function-trace/FunctionTraceBuilderStage.ts';
import { ExternalCallDecoder } from './pipeline/3_function-call-events/decoders/ExternalCallDecoder.ts';
import { ExternalCallResultDecoder } from './pipeline/3_function-call-events/decoders/ExternalCallResultDecoder.ts';
import { FunctionEntryDecoder } from './pipeline/3_function-call-events/decoders/FunctionEntryDecoder.ts';
import { FunctionExitDecoder } from './pipeline/3_function-call-events/decoders/FunctionExitDecoder.ts';

export async function buildCallTracer<LensArtifactsMapT extends LensArtifactsMap<any>>(defaultAccount: Account) {
  const client = await buildClient(defaultAccount);

  const artifactsProvider = new ArtifactsProvider();
  const functionIndexesRegistry = new FunctionIndexesRegistry();
  const pcLocationIndexesRegistry = new PcLocationIndexesRegistry();
  const addressLabeler = new AddressLabeler();
  const sourceMapper = new SourceMapper();

  // Build pipeline transformers
  const externalCallTransform = new ExternalCallDecoder(artifactsProvider, addressLabeler, functionIndexesRegistry);
  const externalCallResultTransform = new ExternalCallResultDecoder(
    artifactsProvider,
    addressLabeler,
    functionIndexesRegistry
  );
  const functionEntryTransform = new FunctionEntryDecoder(pcLocationIndexesRegistry, addressLabeler);
  const functionExitTransform = new FunctionExitDecoder();

  // Build pipeline stages
  const filterStage = new FilterStage();
  const adapterStage = new AdapterStage();
  const enrichEvmEventStage = new EnrichEvmEventStage(pcLocationIndexesRegistry, addressLabeler);
  const opcodeAnalysisStage = new OpcodeAnalysisStage();
  const decodingStage = new DecodingStage(
    externalCallTransform,
    externalCallResultTransform,
    functionEntryTransform,
    functionExitTransform
  );
  const functionTraceBuilderStage = new FunctionTraceBuilderStage();

  // Build pipeline
  const functionTracePipeline = new FunctionTracePipeline(
    filterStage,
    adapterStage,
    enrichEvmEventStage,
    opcodeAnalysisStage,
    decodingStage,
    functionTraceBuilderStage
  );

  const lensClient = new LensClient<LensArtifactsMapT>(
    defaultAccount,
    client,
    artifactsProvider,
    functionIndexesRegistry,
    pcLocationIndexesRegistry,
    addressLabeler,
    sourceMapper,
    functionTracePipeline
  );

  return {
    defaultAccount,
    client,
    artifactsProvider,
    functionIndexesRegistry,
    pcLocationIndexesRegistry,
    addressLabeler,
    lensClient,
  };
}
