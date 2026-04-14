import React, { useState, useCallback } from 'react';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { MaterialIcon } from './lib/MaterialIcon.tsx';
import { TraceNode } from './TraceNode.tsx';
import { getAllPaths } from './lib/trace-utils.ts';

type FunctionTracePanelProps = Readonly<{
  functionTrace: ReadOnlyFunctionCallEvent;
  onSelectTraceNode?: (event: ReadOnlyFunctionCallEvent) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}>;

export const FunctionTracePanel: React.FC<FunctionTracePanelProps> = ({
  functionTrace,
  onSelectTraceNode,
  collapsed,
  onToggleCollapse,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleExpandAll = useCallback(() => {
    const allPaths = getAllPaths(functionTrace);
    setExpandedPaths(allPaths);
  }, [functionTrace]);

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set(['root']));
    setSelectedPath(null);
  }, []);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelectPath = useCallback((path: string) => {
    setSelectedPath(path || null);
  }, []);

  if (collapsed) {
    return (
      <div
        className="h-10 border-t border-zinc-800 bg-zinc-950 flex items-center px-3 cursor-pointer hover:bg-surface-container relative z-20"
        onClick={onToggleCollapse}
      >
        <MaterialIcon name="keyboard_double_arrow_up" className="text-zinc-500 hover:text-zinc-300" size={16} />
        <span className="label-font text-[10px] font-bold text-zinc-400 tracking-widest uppercase ml-2">TRACE</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800 bg-surface-container shrink-0">
        <div className="flex items-center gap-4">
          <span className="label-font text-[11px] font-bold text-zinc-400 tracking-widest uppercase">
            FUNCTION Trace
          </span>
        </div>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-surface-container-high cursor-pointer" title="Filter Traces">
            <MaterialIcon name="filter_list" className="text-zinc-500 hover:text-zinc-300" size={16} />
          </button>
          <button
            className="p-1 hover:bg-surface-container-high cursor-pointer"
            onClick={handleCollapseAll}
            title="Collapse All"
          >
            <MaterialIcon name="unfold_less" className="text-zinc-500 hover:text-zinc-300" size={16} />
          </button>
          <button
            className="p-1 hover:bg-surface-container-high cursor-pointer"
            onClick={handleExpandAll}
            title="Expand All"
          >
            <MaterialIcon name="unfold_more" className="text-zinc-500 hover:text-zinc-300" size={16} />
          </button>
          <button
            className="p-1 hover:bg-surface-container-high cursor-pointer"
            onClick={onToggleCollapse}
            title="Collapse Panel"
          >
            <MaterialIcon name="keyboard_double_arrow_down" className="text-zinc-500 hover:text-zinc-300" size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto code-font text-[11px]">
        <div className="p-2">
          <TraceNode
            event={functionTrace}
            path="root"
            depth={0}
            expandedPaths={expandedPaths}
            selectedPath={selectedPath}
            onToggle={handleToggle}
            onSelectTraceNode={onSelectTraceNode}
            onSelectPath={handleSelectPath}
          />
        </div>
      </div>
    </div>
  );
};
