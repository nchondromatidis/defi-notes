import '../src/styles/index.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { UniswapV2TraceClient } from './UniswapV2TraceClient.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UniswapV2TraceClient />
  </StrictMode>
);
