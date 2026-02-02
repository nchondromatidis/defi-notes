import { Group, Panel, Separator } from 'react-resizable-panels';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import { FunctionTraceViewer } from '@/components/FunctionTraceViewer.tsx';
import { SourceCodeViewer } from '@/components/SourceCodeViewer.tsx';
import { ProjectFilesViewer, type Item } from '@/components/ProjectFilesViewer.tsx';
import React from 'react';

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
    <Group orientation="vertical" className="h-screen">
      <Panel defaultSize={60} className="overflow-hidden   border">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize="30%" maxSize={500} className="overflow-hidden h-full px-4 py-4 border-r">
            <ProjectFilesViewer
              items={projectFiles}
              initialExpandedItems={initialExpandedItems}
              rootItemId={rootItemId}
              onSelectFileFromTree={onSelectFileFromTree}
            />
          </Panel>
          <Panel defaultSize="70%" className="overflow-hidden ml-4 px-4 py-4 h-full">
            <SourceCodeViewer sourceCode={sourceCode} />
          </Panel>
        </Group>
      </Panel>
      <Separator />
      <Panel defaultSize={40} className="overflow-auto p-4 border">
        <FunctionTraceViewer functionTrace={functionTrace} />
      </Panel>
    </Group>
  );
};
