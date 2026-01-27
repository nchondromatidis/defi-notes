import { Group, Panel, Separator } from 'react-resizable-panels';
import type { FunctionCallEvent } from '@defi-notes/evm-lens/src/lens/CallTrace.ts';
import { FunctionTraceViewer } from '@/components/FunctionTraceViewer.tsx';
import { SourceCodeViewer } from '@/components/SourceCodeViewer.tsx';
import ProjectFilesViewer from '@/components/ProjectFilesViewer.tsx';

interface TraceViewerLayoutProps {
  functionTrace: FunctionCallEvent;
  sourceCode?: string;
}

export function TraceViewerLayout({ functionTrace, sourceCode }: TraceViewerLayoutProps) {
  return (
    <Group orientation="vertical" className="h-screen">
      <Panel defaultSize={60} className="overflow-hidden px-4 pt-4 border">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={20} minSize={10} className="overflow-hidden h-full pr-4 border-r">
            <ProjectFilesViewer></ProjectFilesViewer>
          </Panel>
          <Panel defaultSize={70} minSize={20} className="overflow-hidden ml-4 h-full">
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
}
