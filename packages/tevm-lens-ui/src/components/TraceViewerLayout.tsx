import { Group, Panel, Separator } from 'react-resizable-panels';
import { sample1 } from '../../docs/sample-data.ts';
import { FunctionTraceViewer } from '@/components/FunctionTraceViewer.tsx';

export function TraceViewerLayout() {
  return (
    <Group orientation="vertical" className="h-screen">
      <Panel defaultSize={60} className="overflow-hidden border">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Code Editor</span>
        </div>
      </Panel>
      <Separator />
      <Panel defaultSize={40} className="overflow-auto p-4 border">
        <FunctionTraceViewer event={sample1} />
      </Panel>
    </Group>
  );
}
