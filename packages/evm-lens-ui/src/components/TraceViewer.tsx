import { ResizablePanelGroup, ResizablePanel, type Layout } from '@/components/ui/resizable.tsx';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import { FunctionTraceViewer } from '@/components/FunctionTraceViewer.tsx';
import { SourceCodeViewer } from '@/components/SourceCodeViewer.tsx';
import { ProjectFilesViewer, type Item } from '@/components/ProjectFilesViewer.tsx';
import React, { useMemo, useCallback } from 'react';

const MAIN_LAYOUT_KEY = 'evm-lens-trace-viewer-main';
const TOP_LAYOUT_KEY = 'evm-lens-trace-viewer-top';

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

interface TraceViewerLayoutProps {
  functionTrace: ReadOnlyFunctionCallEvent;
  projectFiles: Record<string, Item>;
  rootItemId: string;
  initialExpandedItems: string[];
  onSelectFileFromTree: (fileId: string) => void;
  onSelectFileFromTraceNode: (event: ReadOnlyFunctionCallEvent) => void;
  onScrollToFile: (fileId: string) => void;
  scrollToFileId?: string;
  sourceCode?: string;
  highlightedLine?: number;
}

const DEFAULT_MAIN_LAYOUT: Layout = { top: 60, bottom: 40 };
const DEFAULT_TOP_LAYOUT: Layout = { files: 30, source: 70 };

export const TraceViewer: React.FC<TraceViewerLayoutProps> = ({
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
    <ResizablePanelGroup
      id="trace-viewer-main"
      orientation="vertical"
      className="h-screen"
      defaultLayout={mainLayout}
      onLayoutChanged={handleMainLayoutChange}
    >
      <ResizablePanel id="top" className="overflow-hidden">
        <ResizablePanelGroup
          id="trace-viewer-top"
          orientation="horizontal"
          className="h-full"
          defaultLayout={topLayout}
          onLayoutChanged={handleTopLayoutChange}
        >
          <ResizablePanel id="files" className="overflow-hidden h-full px-4 py-4 border-r">
            <ProjectFilesViewer
              items={projectFiles}
              initialExpandedItems={initialExpandedItems}
              rootItemId={rootItemId}
              onSelectFileFromTree={onSelectFileFromTree}
              onScrollToFile={onScrollToFile}
              scrollToFileId={scrollToFileId}
            />
          </ResizablePanel>
          <ResizablePanel id="source" className="overflow-hidden ml-4 pr-4 py-4 h-full">
            <SourceCodeViewer sourceCode={sourceCode} highlightedLine={highlightedLine} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizablePanel id="bottom" className="overflow-auto p-4 border-t">
        <FunctionTraceViewer functionTrace={functionTrace} onSelectTraceNode={onSelectFileFromTraceNode} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
