import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { solidity } from '@replit/codemirror-lang-solidity';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { MaterialIcon } from './lib/MaterialIcon.tsx';

type SourceCodeTabsProps = Readonly<{
  sourceCode?: string;
  highlightedLine?: number;
  openTabs: string[];
  activeTabFileId?: string;
  onCloseTab: (fileId: string) => void;
  onSelectTab: (fileId: string) => void;
}>;

const SOLIDITY_EXTENSIONS = [solidity];

const scrollToLine = (editor: EditorView, line: number) => {
  const lineStart = editor.state.doc.line(line).from;
  editor.dispatch({
    selection: EditorSelection.cursor(lineStart),
    effects: EditorView.scrollIntoView(lineStart, { y: 'center' }),
  });
};

const getFileName = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
};

const getFolderPath = (filePath: string): string[] => {
  const parts = filePath.split('/');
  return parts.length > 1 ? parts.slice(0, -1) : [];
};

export const SourceCodeTabs: React.FC<SourceCodeTabsProps> = ({ sourceCode, highlightedLine, activeTabFileId }) => {
  const editorRef = useRef<EditorView | null>(null);
  const pendingLineRef = useRef<number | null>(null);

  const extensions = useMemo(() => SOLIDITY_EXTENSIONS, []);

  useEffect(() => {
    if (!highlightedLine || highlightedLine <= 0) return;
    if (editorRef.current) {
      scrollToLine(editorRef.current, highlightedLine);
    } else {
      pendingLineRef.current = highlightedLine;
    }
  }, [highlightedLine]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorRef.current = view;
    if (pendingLineRef.current !== null) {
      scrollToLine(view, pendingLineRef.current);
      pendingLineRef.current = null;
    }
  }, []);

  const breadcrumbParts = activeTabFileId ? getFolderPath(activeTabFileId) : [];
  const activeFileName = activeTabFileId ? getFileName(activeTabFileId) : undefined;

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      <div className="h-10 flex border-b border-zinc-800 bg-zinc-950 shrink-0">
        {activeTabFileId && (
          <div className="px-4 border-r border-zinc-800 flex items-center gap-2 text-xs select-none bg-zinc-900 text-zinc-200">
            <MaterialIcon name="description" className="text-violet-500" size={16} />
            <span>{getFileName(activeTabFileId)}</span>
          </div>
        )}
      </div>

      <div className="h-8 px-4 flex items-center justify-between text-[10px] text-zinc-500 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-2">
          {breadcrumbParts.map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <MaterialIcon name="chevron_right" size={12} className="text-zinc-500" />}
              <span>{part}</span>
            </React.Fragment>
          ))}
          {activeFileName && (
            <>
              {breadcrumbParts.length > 0 && <MaterialIcon name="chevron_right" size={12} className="text-zinc-500" />}
              <span className="text-zinc-300">{activeFileName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#0d0d0d] min-h-0">
        {sourceCode ? (
          <CodeMirror
            value={sourceCode}
            extensions={extensions}
            theme="dark"
            readOnly={true}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              foldGutter: true,
            }}
            className="h-full code-font text-[13px] leading-relaxed"
            onCreateEditor={handleCreateEditor}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
            Select a file to view source code
          </div>
        )}
      </div>
    </div>
  );
};
