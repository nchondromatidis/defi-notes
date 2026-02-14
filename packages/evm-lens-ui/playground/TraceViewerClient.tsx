import { useState, useEffect, useRef, useCallback } from 'react';
import { TraceViewer } from '@/index';
import { setupUniswapV2 } from './uniswap-v2/setup';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import { contractFQNListToProjectFiles } from '@/adapters/project-files-mapper.ts';
import type { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';

export function TraceViewerClient() {
  const [functionTrace, setFunctionTrace] = useState<ReadOnlyFunctionCallEvent | null>(null);
  const [projectFiles, setProjectFiles] = useState<ReturnType<typeof contractFQNListToProjectFiles> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceCode, setSourceCode] = useState<string | undefined>(undefined);
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined);
  const [scrollToFileId, setScrollToFileId] = useState<string | undefined>(undefined);
  const resourceLoaderRef = useRef<HardhatEvmLensHttpRL | null>(null);

  useEffect(() => {
    async function init() {
      const { lensClient, factory, resourceLoader } = await setupUniswapV2();
      resourceLoaderRef.current = resourceLoader;

      const contractFqns = await resourceLoader.getProtocolContractsFqn('uniswap-v2');
      const projectFiles = contractFQNListToProjectFiles(contractFqns);
      setProjectFiles(projectFiles);

      const token1 = await lensClient.deploy(
        'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
        []
      );
      const token2 = await lensClient.deploy(
        'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
        []
      );

      const result = await lensClient.contract(factory, 'createPair', [token1.createdAddress!, token2.createdAddress!]);

      const trace = lensClient.getSucceeded(result);
      if (trace) {
        setFunctionTrace(trace);
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSelectFileFromTree = useCallback(async (fileId: string) => {
    if (resourceLoaderRef.current) {
      const source = await resourceLoaderRef.current.getSource(fileId);
      setSourceCode(source);
      setHighlightedLine(undefined);
      setScrollToFileId(undefined);
    }
  }, []);

  const handleSelectFileFromTraceNode = useCallback(async (event: ReadOnlyFunctionCallEvent) => {
    // Extract file path from contract FQN
    const contractFqn = event.implContractFQN || event.contractFQN;
    if (!contractFqn) return;

    const fileId = contractFqn.split(':')[0];
    if (!fileId) return;

    // Fetch source code if not already loaded
    if (resourceLoaderRef.current) {
      const source = await resourceLoaderRef.current.getSource(fileId);
      setSourceCode(source);
    }

    // Scroll to file in tree
    setScrollToFileId(fileId);

    // Highlight the function start line
    if (event.functionLineStart) {
      setHighlightedLine(event.functionLineStart);
    }
  }, []);

  const handleScrollToFile = useCallback((fileId: string) => {
    setScrollToFileId(fileId);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!functionTrace || !projectFiles) return <div>No trace</div>;

  return (
    <TraceViewer
      functionTrace={functionTrace}
      projectFiles={projectFiles.items}
      rootItemId={projectFiles.rootItemId}
      initialExpandedItems={projectFiles.firstLevelFolderNames}
      onSelectFileFromTree={handleSelectFileFromTree}
      onSelectFileFromTraceNode={handleSelectFileFromTraceNode}
      onScrollToFile={handleScrollToFile}
      scrollToFileId={scrollToFileId}
      sourceCode={sourceCode}
      highlightedLine={highlightedLine}
    />
  );
}
