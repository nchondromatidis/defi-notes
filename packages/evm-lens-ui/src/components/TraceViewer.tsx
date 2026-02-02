import { Group, Panel, Separator } from 'react-resizable-panels';
import type { Layout } from 'react-resizable-panels';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import { FunctionTraceViewer } from '@/components/FunctionTraceViewer.tsx';
import { SourceCodeViewer } from '@/components/SourceCodeViewer.tsx';
import { ProjectFilesViewer, type Item } from '@/components/ProjectFilesViewer.tsx';
import React from 'react';

const MAIN_LAYOUT_KEY = 'evm-lens-trace-viewer-main';
const TOP_LAYOUT_KEY = 'evm-lens-trace-viewer-top';

function saveLayout(key: string, layout: Layout): void {
  localStorage.setItem(key, JSON.stringify(layout));
}

function getSavedLayout(key: string, defaultLayout: Layout): Layout {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultLayout;
    }
  }
  return defaultLayout;
}

interface TraceViewerLayoutProps {
  functionTrace: ReadOnlyFunctionCallEvent;
  projectFiles: Record<string, Item>;
  rootItemId: string;
  initialExpandedItems: string[];
  onSelectFileFromTree: (fileId: string) => void;
  sourceCode?: string;
}

export const TraceViewer: React.FC<TraceViewerLayoutProps> = ({
  functionTrace,
  projectFiles,
  rootItemId,
  initialExpandedItems,
  onSelectFileFromTree,
  sourceCode,
}: TraceViewerLayoutProps) => {
  return (
    <Group
      id="trace-viewer-main"
      orientation="vertical"
      className="h-screen"
      defaultLayout={getSavedLayout(MAIN_LAYOUT_KEY, { top: 60, bottom: 40 })}
      onLayoutChanged={(layout) => saveLayout(MAIN_LAYOUT_KEY, layout)}
    >
      <Panel id="top" className="overflow-hidden border">
        <Group
          id="trace-viewer-top"
          orientation="horizontal"
          className="h-full"
          defaultLayout={getSavedLayout(TOP_LAYOUT_KEY, { files: 30, source: 70 })}
          onLayoutChanged={(layout) => saveLayout(TOP_LAYOUT_KEY, layout)}
        >
          <Panel id="files" className="overflow-hidden h-full px-4 py-4 border-r">
            <ProjectFilesViewer
              items={projectFiles}
              initialExpandedItems={initialExpandedItems}
              rootItemId={rootItemId}
              onSelectFileFromTree={onSelectFileFromTree}
            />
          </Panel>
          <Panel id="source" className="overflow-hidden ml-4 px-4 py-4 h-full">
            <SourceCodeViewer sourceCode={sourceCode} />
          </Panel>
        </Group>
      </Panel>
      <Separator />
      <Panel id="bottom" className="overflow-auto p-4 border">
        <FunctionTraceViewer functionTrace={functionTrace} />
      </Panel>
    </Group>
  );
};
