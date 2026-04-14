import React from 'react';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import type { LensLog } from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import { formatArgs, formatLogs, formatValue, type FormattedLog } from './lib/trace-utils.ts';

const ValueSpan: React.FC<{ value: unknown }> = ({ value }) => {
  const str = formatValue(value);
  if (str.startsWith('0x') && str.length > 10) {
    return (
      <span className="text-secondary code-font flex min-w-0">
        <span className="truncate">{str.slice(0, -4)}</span>
        <span className="shrink-0">{str.slice(-4)}</span>
      </span>
    );
  }
  return <span className="text-secondary code-font truncate min-w-0">{str}</span>;
};

type TraceNodeDetailProps = Readonly<{
  event: ReadOnlyFunctionCallEvent;
}>;

const ParamSection: React.FC<{ args: unknown }> = ({ args }) => {
  if (!args || typeof args !== 'object') return null;

  const entries = Object.entries(args as Record<string, unknown>);
  if (entries.length === 0) return null;

  const nested = entries.filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
  const simple = entries.filter(([, v]) => !(v && typeof v === 'object' && !Array.isArray(v)));

  return (
    <div className="space-y-1">
      {simple.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-2">
          <span className="text-zinc-500 shrink-0">{key}:</span>
          <ValueSpan value={value} />
        </div>
      ))}
      {nested.map(([key, value]) => (
        <div key={key} className="mt-3 pt-2 border-t border-zinc-800/50">
          <div className="text-zinc-500 text-[10px] mb-1 uppercase">{key}:</div>
          <div className="pl-2 space-y-0.5">
            {Object.entries(value as Record<string, unknown>).map(([nk, nv]) => (
              <div key={nk} className="flex justify-between gap-2">
                <span className="text-zinc-500 shrink-0">{nk}:</span>
                <ValueSpan value={nv} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ReturnSection: React.FC<{ returnValue?: unknown; isError: boolean }> = ({ returnValue, isError }) => {
  if (!returnValue || typeof returnValue !== 'object') {
    return (
      <div className="space-y-1">
        <span className={isError ? 'text-error font-bold' : 'text-tertiary font-bold'}>
          {isError ? 'REVERT' : 'SUCCESS'}
        </span>
      </div>
    );
  }

  const entries = Object.entries(returnValue as Record<string, unknown>);

  return (
    <div className="space-y-1">
      <div className="text-zinc-500 text-[10px] mb-1">RESPONSE:</div>
      <div className="pl-2 space-y-0.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-zinc-500 shrink-0">{key}:</span>
            <ValueSpan value={value} />
          </div>
        ))}
      </div>
      <div className="mt-2">
        <span className={isError ? 'text-error font-bold' : 'text-tertiary font-bold'}>
          {isError ? 'REVERT' : 'SUCCESS'}
        </span>
      </div>
    </div>
  );
};

const LogsSection: React.FC<{ logs: readonly LensLog[] }> = ({ logs }) => {
  const formattedLogs = formatLogs(logs);

  if (formattedLogs.length === 0) {
    return <div className="text-zinc-600 text-[10px]">No logs</div>;
  }

  return (
    <div className="space-y-2">
      {formattedLogs.map((log: FormattedLog, idx: number) => (
        <div key={idx} className="bg-zinc-950/50 border border-zinc-800 p-2">
          <div className="text-zinc-300 font-bold mb-1">{log.eventName}</div>
          <div className="pl-2 text-[9px] space-y-0.5">
            {Object.entries(log.args).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-zinc-500">{key}:</span>
                <ValueSpan value={value} />
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

  return (
    <div className="grid grid-cols-3 gap-0 border-t border-zinc-800 min-h-[140px]">
      <div className="p-3 border-r border-zinc-800">
        <div className="label-font text-[9px] text-zinc-500 font-bold uppercase mb-2">PARAMS</div>
        {argsText ? <ParamSection args={event.args} /> : <div className="text-zinc-600 text-[10px]">No params</div>}
      </div>
      <div className="p-3 border-r border-zinc-800">
        <div className="label-font text-[9px] text-zinc-500 font-bold uppercase mb-2">RETURN</div>
        <ReturnSection returnValue={event.result?.returnValue} isError={isError} />
      </div>
      <div className="p-3">
        <div className="label-font text-[9px] text-zinc-500 font-bold uppercase mb-2">LOGS</div>
        <LogsSection logs={event.result?.logs ?? []} />
      </div>
    </div>
  );
};
