import '@/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { sample1 } from '@/mock-data/call-trace.ts';
import { ThemeProvider, TraceViewerLayout } from '@/index';
import { DEFAULT_INITIAL_EXPANDED_ITEMS, DEFAULT_ITEMS } from '@/mock-data/project-files.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TraceViewerLayout
        functionTrace={sample1}
        projectFiles={DEFAULT_ITEMS}
        initialExpandedFolders={DEFAULT_INITIAL_EXPANDED_ITEMS}
      />
    </ThemeProvider>
  </StrictMode>
);
