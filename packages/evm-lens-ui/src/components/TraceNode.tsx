import React from 'react';
import { cn } from './lib/utils.ts';
import type { ReadOnlyFunctionCallEvent } from '@protocol-lens/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { getContractName } from '@protocol-lens/evm-lens/src/client-utils/names.ts';
import { MaterialIcon } from './lib/MaterialIcon.tsx';
import { formatAggregates, getCallTypeStyle } from './lib/trace-utils.ts';
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
  const aggregates = formatAggregates(event.args, event.result?.returnValue, event.result?.logs);

  if (['CREATE', 'CREATE2'].includes(event.callType)) {
    contractName = getContractName(event.createdContractFQN) || 'Unknown';
  }

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTraceNode?.(event);
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) onToggle(path);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleAggregatesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTraceNode?.(event);
    onSelectPath(isSelected ? '' : path);
  };

  const indentPx = 0;
  const borderLeftPx = indentPx + 10;

  return (
    <div className="relative">
      <div
        className={cn('flex items-center gap-2 py-1 pr-2 transition-colors relative', 'hover:bg-muted cursor-pointer')}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={handleRowClick}
      >
        {isSelected && (
          <>
            <div
              className="absolute top-0 bottom-0 right-0 bg-violet-500/10 pointer-events-none"
              style={{ left: `${borderLeftPx}px` }}
            />
          </>
        )}

        <div
          className={cn(
            'flex items-center justify-center w-5 h-5 shrink-0',
            hasChildren && 'hover:bg-muted cursor-pointer'
          )}
          onClick={hasChildren ? handleArrowClick : undefined}
        >
          {isError ? (
            <MaterialIcon name="warning" className="text-destructive" size={14} />
          ) : hasChildren ? (
            <MaterialIcon
              name={isExpanded ? 'expand_more' : 'chevron_right'}
              className="text-muted-foreground"
              size={14}
            />
          ) : (
            <span className="text-muted-foreground text-[10px]">—</span>
          )}
        </div>

        <span className={getCallTypeStyle(event.callType, isError)}>{isError ? 'REVERT' : String(event.callType)}</span>

        <span className={cn('truncate', isError ? 'text-destructive' : 'text-foreground')}>
          {contractName}.{method}
        </span>

        <span
          className="text-muted-foreground font-normal ml-1 font-mono cursor-pointer hover:text-foreground flex items-center gap-0.5"
          onClick={handleAggregatesClick}
        >
          <span className="hidden sm:inline">{aggregates}</span>
          {aggregates && (
            <MaterialIcon
              name="search"
              className={cn('!block sm:!hidden text-muted-foreground', isSelected && 'text-foreground')}
              size={14}
            />
          )}
        </span>
      </div>

      {isSelected && (
        <div
          className="bg-card/50 border-y border-border my-1 cursor-pointer"
          style={{ marginLeft: `${borderLeftPx}px` }}
          onClick={handleDetailClick}
        >
          <TraceNodeDetail event={event} />
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="border-l border-border" style={{ marginLeft: `${borderLeftPx}px` }}>
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
