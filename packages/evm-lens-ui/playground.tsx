import '@/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { sample2 } from './docs/sample-data';
import { ThemeProvider, TraceViewerLayout } from '@/index';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TraceViewerLayout functionTrace={sample2} />
    </ThemeProvider>
  </StrictMode>
);
