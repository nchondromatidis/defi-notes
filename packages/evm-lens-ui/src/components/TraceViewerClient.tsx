'use client';

import { useCallback, useState } from 'react';
import { TraceViewerLayout } from './TraceViewerLayout.tsx';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { contractFQNListToProjectFiles } from '../adapters/project-files-mapper.ts';
import { getSourceContractFqQN } from '@defi-notes/evm-lens/src/client-utils/names.ts';
import type { TraceResult, TraceResultError } from '../types/TraceResult.ts';

export interface TraceViewerClientProps {
  trace: TraceResult;
}

function isTraceResultError(result: TraceResult): result is TraceResultError {
  return 'error' in result;
}

export function TraceViewerClient({ trace }: TraceViewerClientProps) {
  const [sourceCode, setSourceCode] = useState<string | undefined>(undefined);
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined);
  const [scrollToFileId, setScrollToFileId] = useState<string | undefined>(undefined);

  const isError = isTraceResultError(trace);

  const {
    resourceLoader,
    trace: functionTrace,
    contractFqnList,
  } = isError ? { resourceLoader: null, trace: null, contractFqnList: [] } : trace;

  const projectFiles = isError ? null : contractFQNListToProjectFiles(contractFqnList);

  const handleSelectFileFromTree = useCallback(
    async (fileId: string) => {
      if (!resourceLoader) return;
      const source = await resourceLoader.getSource(fileId);
      setSourceCode(source);
      setHighlightedLine(undefined);
      setScrollToFileId(undefined);
    },
    [resourceLoader]
  );

  const handleSelectFileFromTraceNode = useCallback(
    async (event: ReadOnlyFunctionCallEvent) => {
      if (!resourceLoader) return;
      const contractFqn = getSourceContractFqQN(event);
      if (!contractFqn) return;

      const fileId = contractFqn.split(':')[0];
      if (!fileId) return;

      const source = await resourceLoader.getSource(fileId);
      setSourceCode(source);
      setScrollToFileId(fileId);

      if (event.functionLineStart) {
        setHighlightedLine(event.functionLineStart);
      }
    },
    [resourceLoader]
  );

  const handleScrollToFile = useCallback((fileId: string) => {
    setScrollToFileId(fileId);
  }, []);

  if (isError) {
    return <div>Error: {trace.error}</div>;
  }

  return (
    <TraceViewerLayout
      functionTrace={functionTrace!}
      projectFiles={projectFiles!.items}
      rootItemId={projectFiles!.rootItemId}
      initialExpandedItems={projectFiles!.firstLevelFolderNames}
      onSelectFileFromTree={handleSelectFileFromTree}
      onSelectFileFromTraceNode={handleSelectFileFromTraceNode}
      onScrollToFile={handleScrollToFile}
      scrollToFileId={scrollToFileId}
      sourceCode={sourceCode}
      highlightedLine={highlightedLine}
    />
  );
}
