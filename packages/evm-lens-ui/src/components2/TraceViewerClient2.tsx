import { useCallback } from 'react';
import { TraceViewerLayout2 } from './TraceViewerLayout2.tsx';
import { contractFQNListToProjectFiles } from '../adapters/project-files-mapper.ts';
import type { TraceResult, TraceResultError } from '../types/TraceResult.ts';
import { useTraceViewerState } from './hooks/useTraceViewerState.ts';

type TraceViewerClient2Props = Readonly<{
  trace: TraceResult;
}>;

function isTraceResultError(result: TraceResult): result is TraceResultError {
  return 'error' in result;
}

export function TraceViewerClient2({ trace }: TraceViewerClient2Props) {
  const isError = isTraceResultError(trace);

  const {
    resourceLoader,
    trace: functionTrace,
    contractFqnList,
  } = isError ? { resourceLoader: null, trace: null, contractFqnList: [] } : trace;

  const projectFiles = isError ? null : contractFQNListToProjectFiles(contractFqnList);

  const { state, actions } = useTraceViewerState(resourceLoader);

  const handleSelectTab = useCallback(
    async (fileId: string) => {
      await actions.handleSelectFileFromTree(fileId);
    },
    [actions]
  );

  if (isError) {
    return <div className="p-4 text-error">Error: {trace.error}</div>;
  }

  return (
    <TraceViewerLayout2
      functionTrace={functionTrace!}
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
    />
  );
}
