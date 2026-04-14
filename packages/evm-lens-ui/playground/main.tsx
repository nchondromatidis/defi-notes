import '../src/styles2/index.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { UniswapV2TraceClient2 } from './UniswapV2TraceClient2.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UniswapV2TraceClient2 />
  </StrictMode>
);
