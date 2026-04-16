import React from 'react';
import type {
  ReadOnlyFunctionCallEvent,
  LensLog,
} from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { formatArgs, formatLogs, formatValue, type FormattedLog } from './lib/trace-utils.ts';
import { useCopyFeedback } from './lib/useCopyFeedback.ts';
import { cn } from './lib/utils.ts';

type CopyContext = {
  copiedKey: string | null;
  copy: (key: string, value: string) => void;
};

const CopyableValue: React.FC<{ value: string; copyKey: string; ctx: CopyContext }> = ({ value, copyKey, ctx }) => {
  const justCopied = ctx.copiedKey === copyKey;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.copy(copyKey, value);
  };

  if (value.startsWith('0x') && value.length > 10) {
    return (
      <span
        className={cn(
          'text-accent-blue font-mono flex min-w-0 cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-colors',
          justCopied ? 'bg-emerald-500/20' : 'hover:bg-muted'
        )}
        onClick={handleClick}
      >
        <span className="truncate">{value.slice(0, -4)}</span>
        <span className="shrink-0">{value.slice(-4)}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-accent-blue font-mono truncate min-w-0 cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-colors',
        justCopied ? 'bg-emerald-500/20' : 'hover:bg-muted'
      )}
      onClick={handleClick}
    >
      {value}
    </span>
  );
};

const ValueSpan: React.FC<{ value: unknown; path: string; ctx: CopyContext }> = ({ value, path, ctx }) => {
  const str = formatValue(value);
  return <CopyableValue value={str} copyKey={path} ctx={ctx} />;
};

type TraceNodeDetailProps = Readonly<{
  event: ReadOnlyFunctionCallEvent;
}>;

const ParamSection: React.FC<{ args: unknown; path: string; ctx: CopyContext }> = ({ args, path, ctx }) => {
  if (!args || typeof args !== 'object') return null;

  const entries = Object.entries(args as Record<string, unknown>);
  if (entries.length === 0) return null;

  const nested = entries.filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
  const simple = entries.filter(([, v]) => !(v && typeof v === 'object' && !Array.isArray(v)));

  return (
    <div className="space-y-1">
      {simple.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">{key}:</span>
          <ValueSpan value={value} path={`${path}.${key}`} ctx={ctx} />
        </div>
      ))}
      {nested.map(([key, value]) => (
        <div key={key} className="mt-3 pt-2 border-t border-border/50">
          <div className="text-muted-foreground text-[10px] mb-1 uppercase">{key}:</div>
          <div className="pl-2 space-y-0.5">
            {Object.entries(value as Record<string, unknown>).map(([nk, nv]) => (
              <div key={nk} className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{nk}:</span>
                <ValueSpan value={nv} path={`${path}.${key}.${nk}`} ctx={ctx} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ReturnSection: React.FC<{ returnValue?: unknown; isError: boolean; path: string; ctx: CopyContext }> = ({
  returnValue,
  isError,
  path,
  ctx,
}) => {
  if (returnValue == null || typeof returnValue !== 'object') {
    return (
      <div className="space-y-1">
        {returnValue != null && (
          <div className="flex justify-between gap-2">
            <ValueSpan value={returnValue} path={path} ctx={ctx} />
          </div>
        )}
        {isError && <span className="text-destructive font-bold">REVERT</span>}
      </div>
    );
  }

  const entries = Object.entries(returnValue as Record<string, unknown>);

  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-[10px] mb-1">RESPONSE:</div>
      <div className="pl-2 space-y-0.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">{key}:</span>
            <ValueSpan value={value} path={`${path}.${key}`} ctx={ctx} />
          </div>
        ))}
      </div>
      {isError && (
        <div className="mt-2">
          <span className="text-destructive font-bold">REVERT</span>
        </div>
      )}
    </div>
  );
};

const LogsSection: React.FC<{ logs: readonly LensLog[]; path: string; ctx: CopyContext }> = ({ logs, path, ctx }) => {
  const formattedLogs = formatLogs(logs);

  if (formattedLogs.length === 0) {
    return <div className="text-muted-foreground text-[10px]">No logs</div>;
  }

  return (
    <div className="space-y-2">
      {formattedLogs.map((log: FormattedLog, idx: number) => (
        <div key={idx} className="bg-card/50 border border-border p-2">
          <div className="text-foreground font-bold mb-1">{log.eventName}</div>
          <div className="pl-2 text-[9px] space-y-0.5">
            {Object.entries(log.args).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <ValueSpan value={value} path={`${path}[${idx}].${key}`} ctx={ctx} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const TraceNodeDetail: React.FC<TraceNodeDetailProps> = ({ event }) => {
  const isError = event.result?.isError ?? false;
  const argsText = formatArgs(event.args);
  const copyCtx = useCopyFeedback();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-x border-border min-h-[140px]">
      <div className="p-3 border-b md:border-b-0 md:border-r border-border">
        <div className="font-sans text-[9px] text-muted-foreground font-bold uppercase mb-2">PARAMS</div>
        {argsText ? (
          <ParamSection args={event.args} path="params" ctx={copyCtx} />
        ) : (
          <div className="text-muted-foreground text-[10px]">No params</div>
        )}
      </div>
      <div className="p-3 border-b md:border-b-0 md:border-r border-border">
        <div className="font-sans text-[9px] text-muted-foreground font-bold uppercase mb-2">RETURN</div>
        <ReturnSection returnValue={event.result?.returnValue} isError={isError} path="return" ctx={copyCtx} />
      </div>
      <div className="p-3">
        <div className="font-sans text-[9px] text-muted-foreground font-bold uppercase mb-2">LOGS</div>
        <LogsSection logs={event.result?.logs ?? []} path="logs" ctx={copyCtx} />
      </div>
    </div>
  );
};
