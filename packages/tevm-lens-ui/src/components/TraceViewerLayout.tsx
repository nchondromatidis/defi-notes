import { Group, Panel, Separator } from 'react-resizable-panels';

export function TraceViewerLayout() {
  return (
    <Group orientation="vertical" className="flex h-full w-full border min-h-50">
      <Panel className="border">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Header</span>
        </div>
      </Panel>
      <Separator />
      <Panel className="border">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Content</span>
        </div>
      </Panel>
    </Group>
  );
}
