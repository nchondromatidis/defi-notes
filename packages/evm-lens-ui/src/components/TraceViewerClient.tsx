import { useCallback, useMemo } from 'react';
import { TraceViewerLayout } from './TraceViewerLayout.tsx';
import { contractFQNListToProjectFiles } from '../adapters/project-files-mapper.ts';
import type { TraceResult, TraceResultError } from '../types/TraceResult.ts';
import { useTraceViewerState } from './hooks/useTraceViewerState.ts';
import { serializeBigInt } from './lib/serialize-bigint.ts';

type TraceViewerClient2Props = Readonly<{
  trace: TraceResult;
  workflowName: string;
}>;

function isTraceResultError(result: TraceResult): result is TraceResultError {
  return 'error' in result;
}

export function TraceViewerClient({ trace, workflowName }: TraceViewerClient2Props) {
  const isError = isTraceResultError(trace);

  const {
    resourceLoader,
    trace: functionTrace,
    contractFqnList,
    txHash,
  } = isError ? { resourceLoader: null, trace: null, contractFqnList: [], txHash: '' } : trace;

  const projectFiles = isError ? null : contractFQNListToProjectFiles(contractFqnList);
  const safeTrace = useMemo(() => serializeBigInt(functionTrace), [functionTrace]);

  const { state, actions } = useTraceViewerState(resourceLoader);

  const handleSelectTab = useCallback(
    async (fileId: string) => {
      await actions.handleSelectFileFromTree(fileId);
    },
    [actions]
  );

  if (isError) {
    return <div className="p-4 text-destructive">Error: {trace.error}</div>;
  }

  return (
    <TraceViewerLayout
      functionTrace={safeTrace!}
      workflowName={workflowName}
      txHash={txHash}
      projectFiles={projectFiles!.items}
      rootItemId={projectFiles!.rootItemId}
      initialExpandedItems={projectFiles!.firstLevelFolderNames}
      onSelectFileFromTree={actions.handleSelectFileFromTree}
      onSelectFileFromTraceNode={actions.handleSelectFileFromTraceNode}
      onScrollToFile={actions.handleScrollToFile}
      scrollToFileId={state.scrollToFileId}
      sourceCode={state.sourceCode}
      highlightedLine={state.highlightedLine}
      openTabs={state.openTabs}
      activeTabFileId={state.activeTabFileId}
      onCloseTab={actions.handleCloseTab}
      onSelectTab={handleSelectTab}
      sidebarCollapsed={state.sidebarCollapsed}
      onToggleSidebar={actions.handleToggleSidebar}
      tracePanelCollapsed={state.tracePanelCollapsed}
      onToggleTracePanel={actions.handleToggleTracePanel}
      mobileExpandedPanels={state.mobileExpandedPanels}
      onToggleMobilePanel={actions.handleToggleMobilePanel}
    />
  );
}
