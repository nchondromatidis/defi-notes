import { Group, Panel, Separator } from 'react-resizable-panels';
import type { FunctionCallEvent } from '@defi-notes/tevm-lens/src/lens/CallTrace.ts';
import { FunctionTraceViewer } from '@/components/FunctionTraceViewer.tsx';

interface TraceViewerLayoutProps {
  functionTrace: FunctionCallEvent;
}

export function TraceViewerLayout({ functionTrace }: TraceViewerLayoutProps) {
  return (
    <Group orientation="vertical" className="h-screen">
      <Panel defaultSize={60} className="overflow-hidden border">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Code Editor</span>
        </div>
      </Panel>
      <Separator />
      <Panel defaultSize={40} className="overflow-auto p-4 border">
        <FunctionTraceViewer functionTrace={functionTrace} />
      </Panel>
    </Group>
  );
}
