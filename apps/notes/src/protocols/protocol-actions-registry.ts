import { UniswapV2Actions } from '@/protocols/actions/UniswapV2Actions.ts';
import { type MethodArgs, type MethodKeys, type MethodReturn, runMethod } from '@/utils/run-method.ts';
import { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';

export const protocolActionsRegistry = {
  uniswapV2: await UniswapV2Actions.create(new HardhatEvmLensHttpRL('http://localhost:4321', 'contracts')),
} as const;

export type ProtocolActionsRegistry = typeof protocolActionsRegistry;

export type ProtocolActionsMethodKeys<T> = Exclude<MethodKeys<T>, 'deploy' | 'getProjectFiles' | 'toTraceResult'>;

export function runWorkflow<
  R extends Record<string, object> = ProtocolActionsRegistry,
  P extends keyof R = keyof R,
  M extends ProtocolActionsMethodKeys<R[P]> = ProtocolActionsMethodKeys<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
>(registry: R, className: P, methodName: M, args?: A): MethodReturn<R[P], M> {
  return runMethod(registry, className, methodName, args);
}
