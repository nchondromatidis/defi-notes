import React, { useMemo, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, type Layout } from './lib/resizable.ts';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { FunctionTracePanel } from './FunctionTracePanel.tsx';
import { SourceCodeTabs } from './SourceCodeTabs.tsx';
import { ProjectExplorer } from './ProjectExplorer.tsx';
import { StatusBar } from './StatusBar.tsx';
import type { ProjectFileItem } from './types/ProjectFileItem.ts';

const MAIN_LAYOUT_KEY = 'evm-lens-trace-viewer-v2-main';
const TOP_LAYOUT_KEY = 'evm-lens-trace-viewer-v2-top';

function saveLayout(key: string, layout: Layout): void {
  try {
    localStorage.setItem(key, JSON.stringify(layout));
  } catch (error) {
    console.warn('Failed to save layout to localStorage:', error);
  }
}

function getSavedLayout(key: string, defaultLayout: Layout): Layout {
  if (typeof window === 'undefined') {
    return defaultLayout;
  }
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load layout from localStorage:', error);
  }
  return defaultLayout;
}

type TraceViewerLayout2Props = Readonly<{
  functionTrace: ReadOnlyFunctionCallEvent;
  projectFiles: Record<string, ProjectFileItem>;
  rootItemId: string;
  initialExpandedItems: string[];
  onSelectFileFromTree: (fileId: string) => void;
  onSelectFileFromTraceNode: (event: ReadOnlyFunctionCallEvent) => void;
  onScrollToFile: (fileId: string) => void;
  scrollToFileId?: string;
  sourceCode?: string;
  highlightedLine?: number;
  openTabs: string[];
  activeTabFileId?: string;
  onCloseTab: (fileId: string) => void;
  onSelectTab: (fileId: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  tracePanelCollapsed: boolean;
  onToggleTracePanel: () => void;
}>;

const DEFAULT_MAIN_LAYOUT: Layout = { top: 60, bottom: 40 };
const DEFAULT_TOP_LAYOUT: Layout = { files: 25, source: 75 };

export const TraceViewerLayout2: React.FC<TraceViewerLayout2Props> = ({
  functionTrace,
  projectFiles,
  rootItemId,
  initialExpandedItems,
  onSelectFileFromTree,
  onSelectFileFromTraceNode,
  onScrollToFile,
  scrollToFileId,
  sourceCode,
  highlightedLine,
  openTabs,
  activeTabFileId,
  onCloseTab,
  onSelectTab,
  sidebarCollapsed,
  onToggleSidebar,
  tracePanelCollapsed,
  onToggleTracePanel,
}) => {
  const mainLayout = useMemo(() => getSavedLayout(MAIN_LAYOUT_KEY, DEFAULT_MAIN_LAYOUT), []);
  const topLayout = useMemo(() => getSavedLayout(TOP_LAYOUT_KEY, DEFAULT_TOP_LAYOUT), []);

  const handleMainLayoutChange = useCallback((layout: Layout) => {
    saveLayout(MAIN_LAYOUT_KEY, layout);
  }, []);

  const handleTopLayoutChange = useCallback((layout: Layout) => {
    saveLayout(TOP_LAYOUT_KEY, layout);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-on-surface overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <PanelGroup
          key={`main-${tracePanelCollapsed}`}
          orientation="vertical"
          defaultLayout={mainLayout}
          onLayoutChanged={handleMainLayoutChange}
        >
          <Panel id="top" defaultSize={tracePanelCollapsed ? 100 : 60} minSize={20}>
            <PanelGroup
              key={`top-${sidebarCollapsed}`}
              orientation="horizontal"
              defaultLayout={topLayout}
              onLayoutChanged={handleTopLayoutChange}
            >
              {sidebarCollapsed && (
                <div className="shrink-0 border-r border-zinc-800">
                  <ProjectExplorer
                    items={projectFiles}
                    initialExpandedItems={initialExpandedItems}
                    rootItemId={rootItemId}
                    selectedFileId={activeTabFileId}
                    onSelectFileFromTree={onSelectFileFromTree}
                    onScrollToFile={onScrollToFile}
                    scrollToFileId={scrollToFileId}
                    collapsed={true}
                    onToggleCollapse={onToggleSidebar}
                  />
                </div>
              )}
              {!sidebarCollapsed && (
                <>
                  <Panel id="files" defaultSize={25} minSize={10}>
                    <div className="h-full border-r border-zinc-800">
                      <ProjectExplorer
                        items={projectFiles}
                        initialExpandedItems={initialExpandedItems}
                        rootItemId={rootItemId}
                        selectedFileId={activeTabFileId}
                        onSelectFileFromTree={onSelectFileFromTree}
                        onScrollToFile={onScrollToFile}
                        scrollToFileId={scrollToFileId}
                        collapsed={false}
                        onToggleCollapse={onToggleSidebar}
                      />
                    </div>
                  </Panel>
                  <PanelResizeHandle />
                </>
              )}
              <Panel id="source" defaultSize={sidebarCollapsed ? 100 : 75} minSize={30}>
                <SourceCodeTabs
                  sourceCode={sourceCode}
                  highlightedLine={highlightedLine}
                  openTabs={openTabs}
                  activeTabFileId={activeTabFileId}
                  onCloseTab={onCloseTab}
                  onSelectTab={onSelectTab}
                />
              </Panel>
            </PanelGroup>
          </Panel>
          {!tracePanelCollapsed && (
            <>
              <PanelResizeHandle />
              <Panel id="bottom" defaultSize={40} minSize={10}>
                <FunctionTracePanel
                  functionTrace={functionTrace}
                  onSelectTraceNode={onSelectFileFromTraceNode}
                  collapsed={false}
                  onToggleCollapse={onToggleTracePanel}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {tracePanelCollapsed && (
        <FunctionTracePanel
          functionTrace={functionTrace}
          onSelectTraceNode={onSelectFileFromTraceNode}
          collapsed={true}
          onToggleCollapse={onToggleTracePanel}
        />
      )}

      <StatusBar />
    </div>
  );
};
