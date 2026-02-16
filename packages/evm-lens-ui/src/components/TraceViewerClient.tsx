import { useState, useEffect, useRef, useCallback } from 'react';
import { TraceViewer } from '@/index';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import { contractFQNListToProjectFiles } from '@/adapters/project-files-mapper.ts';
import type { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';

export interface SetupResult {
  resourceLoader: HardhatEvmLensHttpRL;
  trace: ReadOnlyFunctionCallEvent;
  projectFiles: ReturnType<typeof contractFQNListToProjectFiles>;
}

export interface TraceViewerClientProps {
  setup: () => Promise<SetupResult>;
}

export function TraceViewerClient({ setup }: TraceViewerClientProps) {
  const [functionTrace, setFunctionTrace] = useState<ReadOnlyFunctionCallEvent | null>(null);
  const [projectFiles, setProjectFiles] = useState<ReturnType<typeof contractFQNListToProjectFiles> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sourceCode, setSourceCode] = useState<string | undefined>(undefined);
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined);
  const [scrollToFileId, setScrollToFileId] = useState<string | undefined>(undefined);
  const resourceLoaderRef = useRef<HardhatEvmLensHttpRL | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const { resourceLoader, trace, projectFiles } = await setup();
        resourceLoaderRef.current = resourceLoader;
        setProjectFiles(projectFiles);
        setFunctionTrace(trace);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [setup]);

  const handleSelectFileFromTree = useCallback(async (fileId: string) => {
    if (resourceLoaderRef.current) {
      const source = await resourceLoaderRef.current.getSource(fileId);
      setSourceCode(source);
      setHighlightedLine(undefined);
      setScrollToFileId(undefined);
    }
  }, []);

  const handleSelectFileFromTraceNode = useCallback(async (event: ReadOnlyFunctionCallEvent) => {
    const contractFqn = event.implContractFQN || event.contractFQN;
    if (!contractFqn) return;

    const fileId = contractFqn.split(':')[0];
    if (!fileId) return;

    if (resourceLoaderRef.current) {
      const source = await resourceLoaderRef.current.getSource(fileId);
      setSourceCode(source);
    }

    setScrollToFileId(fileId);

    if (event.functionLineStart) {
      setHighlightedLine(event.functionLineStart);
    }
  }, []);

  const handleScrollToFile = useCallback((fileId: string) => {
    setScrollToFileId(fileId);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
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
