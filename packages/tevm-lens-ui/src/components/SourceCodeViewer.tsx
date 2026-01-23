import CodeMirror from '@uiw/react-codemirror';
import { solidity } from '@replit/codemirror-lang-solidity';
import { oneDark } from '@codemirror/theme-one-dark';

interface SourceCodeViewerProps {
  sourceCode?: string;
}

export function SourceCodeViewer({
  sourceCode = '// Select a function to view its source code',
}: SourceCodeViewerProps) {
  const extensions = [solidity];

  return (
    <div className="h-full w-full overflow-hidden">
      <CodeMirror
        value={sourceCode}
        extensions={extensions}
        theme={oneDark}
        readOnly={true}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          foldGutter: true,
        }}
        className="h-full"
      />
    </div>
  );
}

//https://github.com/brimdata/react-arborist/blob/main/modules/showcase/pages/gmail.tsx
