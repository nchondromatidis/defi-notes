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

// tevm-lens-ui Add a file tree view on the right of the code editor.
// - The file tree view will be using react-arbonist. Look how it is used here https://github.com/brimdata/react-arborist/blob/main/modules/showcase/pages/gmail.tsx
//   - The .sol will use ethereum logo svg
// - As input will take a list of contracts in the form of array like `packages/protocols/artifacts/contracts/uniswap-v2/function-indexes.json`
