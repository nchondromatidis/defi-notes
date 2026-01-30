import CodeMirror from '@uiw/react-codemirror';
import { solidity } from '@replit/codemirror-lang-solidity';
import { oneDark } from '@codemirror/theme-one-dark';
import React from 'react';

interface SourceCodeViewerProps {
  sourceCode?: string;
}

export const SourceCodeViewer: React.FC<SourceCodeViewerProps> = ({ sourceCode }: SourceCodeViewerProps) => {
  if (!sourceCode) return null;

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
};
