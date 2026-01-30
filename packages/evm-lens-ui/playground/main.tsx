import '@/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/index';
import { TraceViewerClient } from './TraceViewerClient.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TraceViewerClient />
    </ThemeProvider>
  </StrictMode>
);
