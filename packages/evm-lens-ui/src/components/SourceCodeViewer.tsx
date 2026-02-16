import CodeMirror from '@uiw/react-codemirror';
import { solidity } from '@replit/codemirror-lang-solidity';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEffect, useRef, useMemo } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

import React from 'react';

interface SourceCodeViewerProps {
  sourceCode?: string;
  highlightedLine?: number;
}

const SOLIDITY_EXTENSIONS = [solidity];

export const SourceCodeViewer: React.FC<SourceCodeViewerProps> = ({ sourceCode, highlightedLine }) => {
  const editorRef = useRef<EditorView | null>(null);

  const extensions = useMemo(() => SOLIDITY_EXTENSIONS, []);

  useEffect(() => {
    if (editorRef.current && highlightedLine && highlightedLine > 0) {
      const line = highlightedLine - 1; // CodeMirror uses 0-based indexing
      const editor = editorRef.current;

      // Create a selection at the start of the target line
      const lineStart = editor.state.doc.line(line + 1).from;
      editor.dispatch({
        selection: EditorSelection.cursor(lineStart),
        effects: EditorView.scrollIntoView(lineStart, { y: 'center' }),
      });
    }
  }, [highlightedLine]);

  if (!sourceCode) return null;

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
        onCreateEditor={(view) => {
          editorRef.current = view;
        }}
      />
    </div>
  );
};
