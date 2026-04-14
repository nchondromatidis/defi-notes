import React from 'react';
import { cn } from './lib/utils.ts';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { getContractName } from '@defi-notes/evm-lens/src/client-utils/names.ts';
import { MaterialIcon } from './lib/MaterialIcon.tsx';
import { formatArgs, formatResult, getCallTypeStyle } from './lib/trace-utils.ts';
import { TraceNodeDetail } from './TraceNodeDetail.tsx';

type TraceNodeProps = Readonly<{
  event: ReadOnlyFunctionCallEvent;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelectTraceNode?: (event: ReadOnlyFunctionCallEvent) => void;
  onSelectPath: (path: string) => void;
}>;

export const TraceNode: React.FC<TraceNodeProps> = ({
  event,
  path,
  depth,
  expandedPaths,
  selectedPath,
  onToggle,
  onSelectTraceNode,
  onSelectPath,
}) => {
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;
  const hasChildren = !!(event.called && event.called.length > 0);
  const isError = event.result?.isError ?? false;

  let contractName = getContractName(event.contractFQN) || event.to || 'Unknown';
  const method = event.functionName || event.functionType;
  const argsText = formatArgs(event.args);
  const resultText = event.result?.returnValue ? formatResult(event.result.returnValue) : '';

  if (['CREATE', 'CREATE2'].includes(event.callType)) {
    contractName = getContractName(event.createdContractFQN) || 'Unknown';
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(path);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTraceNode?.(event);
    onSelectPath(isSelected ? '' : path);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-2 py-1 px-2 transition-colors border-l-2',
          'hover:bg-surface-container-high cursor-pointer',
          isSelected ? 'bg-violet-500/10 border-violet-500' : 'border-transparent'
        )}
        onClick={handleRowClick}
      >
        <div
          className="flex items-center justify-center w-5 h-5 shrink-0 hover:bg-surface-container-high cursor-pointer"
          onClick={handleExpandClick}
        >
          {isError ? (
            <MaterialIcon name="warning" className="text-error" size={14} />
          ) : hasChildren ? (
            <MaterialIcon name={isExpanded ? 'expand_more' : 'chevron_right'} className="text-zinc-500" size={14} />
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        <span className={getCallTypeStyle(event.callType, isError)}>{isError ? 'REVERT' : String(event.callType)}</span>

        <span className={cn('truncate', isError ? 'text-error' : 'text-zinc-300')}>
          {contractName}.{method}
        </span>

        {argsText && (
          <>
            <span className="text-zinc-600">(</span>
            <span className="text-zinc-500 truncate italic">{argsText}</span>
            <span className="text-zinc-600">)</span>
          </>
        )}

        {resultText && <span className="text-zinc-600 ml-auto code-font text-[10px]">{resultText}</span>}
      </div>

      {isSelected && (
        <div className="bg-surface-container/50 border-y border-zinc-800 my-1">
          <div className="bg-violet-500/10 border-l-2 border-violet-500">
            <TraceNodeDetail event={event} />
          </div>
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="ml-8 border-l border-zinc-800">
          {event.called?.map((childEvent, idx) => (
            <TraceNode
              key={`${path}-${idx}`}
              event={childEvent}
              path={`${path}-${idx}`}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelectTraceNode={onSelectTraceNode}
              onSelectPath={onSelectPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
