'use client';

import CodeMirror from '@uiw/react-codemirror';
import { solidity } from '@replit/codemirror-lang-solidity';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import React from 'react';

interface SourceCodeViewerProps {
  sourceCode?: string;
  highlightedLine?: number;
}

const SOLIDITY_EXTENSIONS = [solidity];

const scrollToLine = (editor: EditorView, line: number) => {
  const lineStart = editor.state.doc.line(line).from;
  editor.dispatch({
    selection: EditorSelection.cursor(lineStart),
    effects: EditorView.scrollIntoView(lineStart, { y: 'center' }),
  });
};

export const SourceCodeViewer: React.FC<SourceCodeViewerProps> = ({ sourceCode, highlightedLine }) => {
  const editorRef = useRef<EditorView | null>(null);
  const pendingLineRef = useRef<number | null>(null);

  const extensions = useMemo(() => SOLIDITY_EXTENSIONS, []);

  // Runs when highlightedLine changes
  useEffect(() => {
    if (!highlightedLine || highlightedLine <= 0) return;

    if (editorRef.current) {
      // Editor already exists — scroll immediately
      scrollToLine(editorRef.current, highlightedLine);
    } else {
      // Editor not yet created — store for later
      pendingLineRef.current = highlightedLine;
    }
  }, [highlightedLine]);

  // Runs when the editor is first created
  const handleCreateEditor = useCallback((view: EditorView) => {
    editorRef.current = view;

    // Apply any highlight that was requested before the editor existed
    if (pendingLineRef.current !== null) {
      scrollToLine(view, pendingLineRef.current);
      pendingLineRef.current = null;
    }
  }, []);

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
        onCreateEditor={handleCreateEditor}
      />
    </div>
  );
};
