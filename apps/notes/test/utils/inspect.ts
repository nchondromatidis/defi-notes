import util from 'node:util';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/handlers/FunctionTrace.ts';

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
    console.log(`${call.depth}, ${call.contractFQN?.split(':')[1]} ${call.functionName || '<unknown>'}`);
    if (call.called) {
      for (const nestedCall of call.called) {
        logCall(nestedCall);
      }
    }
  }
  logCall(fnCallEvent);
}
