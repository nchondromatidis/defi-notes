import { TraceViewer } from '@/index';
import { sample1 } from './mock-data/call-trace';
import { DEFAULT_INITIAL_EXPANDED_ITEMS, DEFAULT_ITEMS } from './mock-data/project-files';

export function TraceViewerClient() {
  return (
    <TraceViewer
      functionTrace={sample1}
      projectFiles={DEFAULT_ITEMS}
      initialExpandedFolders={DEFAULT_INITIAL_EXPANDED_ITEMS}
    />
  );
}
