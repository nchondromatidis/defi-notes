// Main components
export { TraceViewerLayout } from './components/TraceViewerLayout.tsx';
export { FunctionTraceViewer } from './components/FunctionTraceViewer.tsx';
// Theme provider (optional, for consumers who want theme support)
// Note: Components work standalone, ThemeProvider is optional
export { ThemeProvider, useTheme } from './providers/theme-provider.tsx';

// Re-export types for convenience
export type { FunctionCallEvent } from '@defi-notes/tevm-lens/src/lens/CallTrace.ts';

// Note: CSS must be imported separately: import 'tevm-lens-ui/styles'
