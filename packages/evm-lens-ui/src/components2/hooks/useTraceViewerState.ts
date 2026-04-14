import { useCallback, useState } from 'react';
import type { IResourceLoader } from '@defi-notes/evm-lens/src/lens/_ports/IResourceLoader.ts';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { getSourceContractFqQN } from '@defi-notes/evm-lens/src/client-utils/names.ts';

export type TraceViewerState = {
  sourceCode: string | undefined;
  highlightedLine: number | undefined;
  scrollToFileId: string | undefined;
  openTabs: string[];
  activeTabFileId: string | undefined;
  sidebarCollapsed: boolean;
  tracePanelCollapsed: boolean;
};

export type TraceViewerActions = {
  handleSelectFileFromTree: (fileId: string) => void;
  handleSelectFileFromTraceNode: (event: ReadOnlyFunctionCallEvent) => void;
  handleCloseTab: (fileId: string) => void;
  handleScrollToFile: (fileId: string) => void;
  handleToggleSidebar: () => void;
  handleToggleTracePanel: () => void;
};

export function useTraceViewerState(resourceLoader: IResourceLoader | null) {
  const [state, setState] = useState<TraceViewerState>({
    sourceCode: undefined,
    highlightedLine: undefined,
    scrollToFileId: undefined,
    openTabs: [],
    activeTabFileId: undefined,
    sidebarCollapsed: false,
    tracePanelCollapsed: false,
  });

  const handleSelectFileFromTree = useCallback(
    async (fileId: string) => {
      if (!resourceLoader) return;
      const source = await resourceLoader.getSource(fileId);
      setState((prev) => {
        const openTabs = prev.openTabs.includes(fileId) ? prev.openTabs : [...prev.openTabs, fileId];
        return {
          ...prev,
          sourceCode: source,
          highlightedLine: undefined,
          scrollToFileId: undefined,
          openTabs,
          activeTabFileId: fileId,
        };
      });
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
      setState((prev) => {
        const openTabs = prev.openTabs.includes(fileId) ? prev.openTabs : [...prev.openTabs, fileId];
        return {
          ...prev,
          sourceCode: source,
          scrollToFileId: fileId,
          highlightedLine: event.functionLineStart ?? undefined,
          openTabs,
          activeTabFileId: fileId,
        };
      });
    },
    [resourceLoader]
  );

  const handleCloseTab = useCallback((fileId: string) => {
    setState((prev) => {
      const openTabs = prev.openTabs.filter((t) => t !== fileId);
      const isActive = prev.activeTabFileId === fileId;
      const newActiveTab = isActive ? openTabs[openTabs.length - 1] : prev.activeTabFileId;
      return {
        ...prev,
        openTabs,
        activeTabFileId: newActiveTab,
      };
    });
  }, []);

  const handleScrollToFile = useCallback((fileId: string) => {
    setState((prev) => ({ ...prev, scrollToFileId: fileId }));
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const handleToggleTracePanel = useCallback(() => {
    setState((prev) => ({ ...prev, tracePanelCollapsed: !prev.tracePanelCollapsed }));
  }, []);

  return {
    state,
    actions: {
      handleSelectFileFromTree,
      handleSelectFileFromTraceNode,
      handleCloseTab,
      handleScrollToFile,
      handleToggleSidebar,
      handleToggleTracePanel,
    },
  };
}
