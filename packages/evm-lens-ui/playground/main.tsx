import '@/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/index';
import { UniswapV2TraceClient } from './UniswapV2TraceClient.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UniswapV2TraceClient />
    </ThemeProvider>
  </StrictMode>
);
