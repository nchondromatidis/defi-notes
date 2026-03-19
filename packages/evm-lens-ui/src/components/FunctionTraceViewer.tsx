'use client';

import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, Maximize2, Minimize2, ArrowRight, ListTree } from 'lucide-react';
import { cn } from './lib/utils.ts';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { getContractName } from '@defi-notes/evm-lens/src/client-utils/names.ts';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

// --- Helper Functions ---

const getAllPaths = (
  node: ReadOnlyFunctionCallEvent,
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

const getBadgeVariant = (callType: string, isError: boolean) => {
  if (isError) return 'destructive';
  const type = callType.toUpperCase();
  if (type.includes('JUMP') || type === 'INTERNAL') return 'default';
  if (type === 'STATICCALL' || type === 'S-CALL') return 'secondary';
  if (type === 'DELEGATECALL') return 'outline';
  if (type === 'CREATE' || type === 'CREATE2') return 'default';
  return 'default';
};

const getBadgeClassName = (callType: string, isError: boolean) => {
  if (isError) return 'bg-destructive/50 text-destructive-foreground border-destructive';
  const type = callType.toUpperCase();
  if (type.includes('JUMP') || type === 'INTERNAL')
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (type === 'STATICCALL') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
  if (type === 'DELEGATECALL') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
  if (type === 'CREATE' || type === 'CREATE2')
    return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
  return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
};

// --- Sub-components ---

interface ExpandCollapseIconProps {
  isError: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
}

const ExpandCollapseIcon: React.FC<ExpandCollapseIconProps> = ({ isError, hasChildren, isExpanded }) => {
  if (isError) {
    return <AlertTriangle className="w-4 h-4 text-destructive" />;
  }
  if (!hasChildren) {
    return <div className="w-4 h-4" />;
  }
  return isExpanded ? (
    <ChevronDown className="w-4 h-4 text-muted-foreground" />
  ) : (
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  );
};

interface TraceNodeProps {
  event: ReadOnlyFunctionCallEvent;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelectTraceNode?: (event: ReadOnlyFunctionCallEvent) => void;
}

const TraceNode: React.FC<TraceNodeProps> = ({ event, path, depth, expandedPaths, onToggle, onSelectTraceNode }) => {
  const isExpanded = expandedPaths.has(path);
  const hasChildren = !!(event.called && event.called.length > 0);
  const isError = event.result?.isError || false;

  // Layout Constants
  const INDENT_PX = 20;
  const BADGE_COL_WIDTH = '7rem';
  const BADGE_WIDTH = 'w-24';

  let contractName = getContractName(event.contractFQN) || event.to || 'Unknown';
  const method = event.functionName || event.functionType;
  const argsText = formatArgs(event.args);
  const resultText = event.result?.returnValue ? formatResult(event.result.returnValue) : '';

  if (['CREATE', 'CREATE2'].includes(event.callType)) {
    contractName = getContractName(event.createdContractFQN) || 'Unknown';
  }

  // -- Handlers --
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(path);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTraceNode?.(event);
  };

  return (
    <div className="relative">
      {/* Row Container */}
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors',
          'hover:bg-accent/50 cursor-pointer group'
        )}
        onClick={handleRowClick}
      >
        {/* 1. Badge Column (Fixed Left) */}
        <div style={{ width: BADGE_COL_WIDTH }} className="flex items-center justify-start shrink-0">
          <Badge
            variant={getBadgeVariant(event.callType, isError)}
            className={cn(BADGE_WIDTH, 'font-mono h-5', getBadgeClassName(event.callType, isError))}
          >
            <span className="block badgeText">{isError ? 'REVERT' : String(event.callType)}</span>
          </Badge>
        </div>

        {/* 2. Indentation Spacer */}
        <div style={{ width: `${depth * INDENT_PX}px` }} className="shrink-0" />

        {/* 3. Expand/Collapse Arrow - CLICKABLE AREA */}
        <div
          className="flex items-center justify-center w-5 h-5 shrink-0 hover:bg-accent rounded"
          onClick={handleExpandClick}
        >
          <ExpandCollapseIcon isError={isError} hasChildren={hasChildren} isExpanded={isExpanded} />
        </div>

        {/* 4. Content */}
        <div className="flex items-center gap-1 flex-1 min-w-0 text-sm">
          <span className="font-semibold text-foreground truncate">{contractName}</span>
          <span className="text-muted-foreground">.</span>
          <span className="font-medium text-primary truncate">{method}</span>
          <span className="text-muted-foreground">(</span>
          <span className="text-muted-foreground truncate italic">{argsText}</span>
          <span className="text-muted-foreground">)</span>

          {/* Return Value Arrow - Centered */}
          {resultText && (
            <div className="flex items-center gap-1.5 ml-2 text-accent-foreground">
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-xs truncate">{resultText}</span>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add action buttons here if needed */}
        </div>
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical Trace Line */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `calc(${BADGE_COL_WIDTH} + ${(depth + 1) * INDENT_PX}px + 0.625rem)` }}
          />
          {event.called?.map((childEvent, idx) => (
            <TraceNode
              key={`${path}-${idx}`}
              event={childEvent}
              path={`${path}-${idx}`}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelectTraceNode={onSelectTraceNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Export Component ---

interface TransactionTraceViewerProps {
  functionTrace: ReadOnlyFunctionCallEvent;
  className?: string;
  onSelectTraceNode?: (event: ReadOnlyFunctionCallEvent) => void;
}

export const FunctionTraceViewer: React.FC<TransactionTraceViewerProps> = ({
  functionTrace,
  className,
  onSelectTraceNode,
}) => {
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
    <Card className={cn('flex flex-col h-full pb-4 pt-4 gap-0', className)}>
      <CardHeader className="border-b bg-card p-0 m-0 [.border-b]:pb-0">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ListTree className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Trace Viewer</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleCollapseAll} title="Collapse All">
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExpandAll} title="Expand All">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Main Content Area with ScrollArea */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-4 min-w-max">
            <TraceNode
              event={functionTrace}
              path="root"
              depth={0}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onSelectTraceNode={onSelectTraceNode}
            />
          </div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
