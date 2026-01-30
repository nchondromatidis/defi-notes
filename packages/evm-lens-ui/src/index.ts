// Main components
export { TraceViewer } from './components/TraceViewer.tsx';
export { FunctionTraceViewer } from './components/FunctionTraceViewer.tsx';
// Theme provider (optional, for consumers who want theme support)
// Note: Components work standalone, ThemeProvider is optional
export { ThemeProvider, useTheme } from './providers/theme-provider.tsx';

// Note: CSS must be imported separately: import 'tevm-lens-ui/styles'
