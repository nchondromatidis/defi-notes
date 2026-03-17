import util from 'node:util';
import type { ReadOnlyFunctionCallEvent } from '../../../src/lens/handlers/FunctionTrace.ts';

declare global {
  interface Uint8Array {
    [util.inspect.custom]: () => string;
  }
}

Uint8Array.prototype[util.inspect.custom] = function () {
  return `0x${Buffer.from(this).toString('hex')}`;
};

export function inspect(obj: unknown) {
  console.log(util.inspect(obj, { depth: 14, colors: true }));
}

export function functionOrder(fnCallEvent?: ReadOnlyFunctionCallEvent) {
  if (!fnCallEvent) return;
  function logCall(call: ReadOnlyFunctionCallEvent) {
    const callSourceLine = `${call.functionSource}:${call.functionCallLineStart}:${call.functionCallLineEnd}`;
    console.log(`${call.depth},  ${callSourceLine} ${call.functionName || '<unknown>'}`);
    if (call.called) {
      for (const nestedCall of call.called) {
        logCall(nestedCall);
      }
    }
  }
  logCall(fnCallEvent);
}

function extractFunctionHierarchy(event: ReadOnlyFunctionCallEvent | undefined, indent: string = ''): string[] {
  if (!event) return [];

  const result: string[] = [];

  const formattedName = `${indent} ${event.depth} ${event.functionName}`.padEnd(40);
  const callSourceLine = `${event.functionSource}:${event.functionLineStart}:${event.functionLineEnd}`;
  result.push(`${formattedName} ${callSourceLine}`);

  for (const child of event.called || []) {
    result.push(...extractFunctionHierarchy(child, indent + '  '));
  }

  return result;
}

export function printFunctionHierarchy(event: ReadOnlyFunctionCallEvent | undefined): void {
  if (!event) return;
  console.log(extractFunctionHierarchy(event).join('\n'));
}
