import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, Maximize2, Minimize2, Activity, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import type { FunctionCallEvent } from '@defi-notes/tevm-lens/src/lens/CallTrace.ts';

// --- Helper Functions ---

const getAllPaths = (
  node: FunctionCallEvent,
  currentPath: string = 'root',
  paths: Set<string> = new Set()
): Set<string> => {
  paths.add(currentPath);
  if (node.called && node.called.length > 0) {
    node.called.forEach((child, index) => {
      getAllPaths(child, `${currentPath}-${index}`, paths);
    });
  }
  return paths;
};

const formatArgs = (args: unknown): string => {
  if (!args || typeof args !== 'object') return '';
  if (Array.isArray(args)) return args.join(', ');

  return Object.entries(args)
    .map(([key, value]) => `${key} = ${String(value)}`)
    .join(', ');
};

const formatResult = (result?: unknown): string => {
  if (result === undefined || result === null) return '';
  if (typeof result === 'object') {
    if (Array.isArray(result)) return `(${result.join(', ')})`;
    const values = Object.values(result);
    if (values.length > 0) return `(${values.join(', ')})`;
    return '()';
  }
  return `(${String(result)})`;
};

const getBadgeStyles = (callType: string, isError: boolean) => {
  if (isError) return 'bg-red-900/50 text-red-200 border-red-800';

  const type = callType.toUpperCase();
  if (type.includes('JUMP') || type === 'INTERNAL') return 'bg-emerald-900/50 text-emerald-200 border-emerald-800';
  if (type === 'STATICCALL' || type === 'S-CALL') return 'bg-purple-900/50 text-purple-200 border-purple-800';
  if (type === 'DELEGATECALL') return 'bg-orange-900/50 text-orange-200 border-orange-800';
  if (type === 'CREATE' || type === 'CREATE2') return 'bg-yellow-900/50 text-yellow-200 border-yellow-800';

  return 'bg-blue-900/50 text-blue-200 border-blue-800';
};

// --- Sub-components ---

interface TraceNodeProps {
  event: FunctionCallEvent;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  isLastChild?: boolean;
}

const TraceNode: React.FC<TraceNodeProps> = ({ event, path, depth, expandedPaths, onToggle }) => {
  const isExpanded = expandedPaths.has(path);
  const hasChildren = event.called && event.called.length > 0;
  const isError = event.result?.isError || false;

  // Layout Constants
  const INDENT_PX = 20;
  const BADGE_COL_WIDTH = '7rem'; // 112px total width allocated for badge column
  const BADGE_WIDTH = 'w-24'; // Fixed width of the badge itself

  const contract = event.contractFQN || event.to || 'Unknown';
  const method = event.functionName || 'fallback';
  const argsText = formatArgs(event.args);
  const resultText = event.result?.returnValue ? formatResult(event.result.returnValue) : '';

  // -- Handlers --

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(path);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Row clicked:', event);
  };

  return (
    <div className="flex flex-col relative font-mono text-sm leading-6">
      {/* Row Container */}
      <div
        className={cn(
          'flex items-center hover:bg-white/5 py-0.5 pr-2 group transition-colors cursor-pointer',
          isError && 'bg-red-950/10'
        )}
        onClick={handleRowClick}
      >
        {/* 1. Badge Column (Fixed Left) */}
        <div
          className="flex-shrink-0 flex items-center justify-center px-2 select-none"
          style={{ width: BADGE_COL_WIDTH }}
        >
          <span
            className={cn(
              'text-[10px] font-bold py-0.5 rounded border text-center uppercase tracking-wider truncate',
              BADGE_WIDTH,
              getBadgeStyles(String(event.callType), isError)
            )}
          >
            {isError ? 'REVERT' : String(event.callType)}
          </span>
        </div>

        {/* 2. Indentation Spacer */}
        <div
          className="flex-shrink-0 relative flex items-center justify-end"
          style={{ width: `${depth * INDENT_PX}px` }}
        />

        {/* 3. Expand/Collapse Arrow - CLICKABLE AREA */}
        <div
          className="flex-shrink-0 w-6 h-6 flex justify-center items-center text-zinc-500 hover:text-zinc-300"
          onClick={handleExpandClick}
        >
          {isError ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          ) : hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </div>

        {/* 4. Content */}
        <div className="ml-1 flex flex-wrap items-center gap-x-1 break-all">
          <span className="text-blue-400 font-medium">{contract}</span>
          <span className="text-zinc-400">.</span>
          <span className="text-purple-300 font-semibold">{method}</span>
          <span className="text-zinc-500">(</span>
          <span className="text-zinc-300 text-xs">{argsText}</span>
          <span className="text-zinc-500">)</span>

          {/* Return Value Arrow - Centered */}
          {resultText && (
            <div className="flex items-center gap-1 ml-1">
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <span className="text-emerald-400/80 text-xs">{resultText}</span>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-2">
          <Activity className="w-3 h-3 text-zinc-600" />
        </div>
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical Trace Line */}
          <div
            className="absolute bg-zinc-700/50 w-px bottom-0 top-0"
            style={{
              left: `calc(${BADGE_COL_WIDTH} + ${(depth + 1) * INDENT_PX}px - 0.5rem)`,
            }}
          />

          {event.called?.map((childEvent, idx) => (
            <TraceNode
              key={`${path}-${idx}`}
              event={childEvent}
              path={`${path}-${idx}`}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              isLastChild={idx === (event.called?.length || 0) - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Export Component ---

interface TransactionTraceViewerProps {
  functionTrace: FunctionCallEvent;
  className?: string;
}

export const FunctionTraceViewer: React.FC<TransactionTraceViewerProps> = ({ functionTrace, className }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  const handleExpandAll = useCallback(() => {
    const allPaths = getAllPaths(functionTrace);
    setExpandedPaths(allPaths);
  }, [functionTrace]);

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set(['root']));
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

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#0f0f11] text-zinc-300 rounded-lg overflow-hidden border border-zinc-800',
        className
      )}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#18181b]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Trace Viewer</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400">Tx Trace</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
          >
            <Maximize2 className="w-3 h-3" />
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
          >
            <Minimize2 className="w-3 h-3" />
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Content Area with Custom Scrollbar */}
      <div className="flex-1 overflow-auto p-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
        <div className="min-w-max pb-10">
          <TraceNode
            event={functionTrace}
            path="root"
            depth={0}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
          />
        </div>
      </div>
    </div>
  );
};
