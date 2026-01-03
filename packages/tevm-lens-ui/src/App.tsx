import { TraceViewerLayout } from '@/components/TraceViewerLayout.tsx';
import { ThemeProvider } from '@/providers/theme-provider.tsx';

function App() {
  return (
    <div>
      <ThemeProvider>
        <TraceViewerLayout></TraceViewerLayout>
      </ThemeProvider>
    </div>
  );
}

export default App;
