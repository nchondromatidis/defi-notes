import { UniswapV2Workflows } from '@/protocols/workflows/UniswapV2Workflows.ts';
import { type MethodArgs, type MethodKeys, type MethodReturn, runMethod } from '@/utils/run-method.ts';
import { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';

export const protocolWorkflowsRegistry = {
  uniswapV2: await UniswapV2Workflows.create(new HardhatEvmLensHttpRL('http://localhost:4321', 'contracts')),
} as const;

export type ProtocolWorkflowsRegistry = typeof protocolWorkflowsRegistry;

// TODO: this needs refactoring
export type ProtocolActionsMethodKeys<T> = Exclude<
  MethodKeys<T>,
  'deploy' | 'getProjectFiles' | 'toTraceResult' | 'maxUint256' | 'deployErc20WithInitAmounts'
>;

export function runWorkflow<
  R extends Record<string, object> = ProtocolWorkflowsRegistry,
  P extends keyof R = keyof R,
  M extends ProtocolActionsMethodKeys<R[P]> = ProtocolActionsMethodKeys<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
>(registry: R, className: P, methodName: M, args?: A): MethodReturn<R[P], M> {
  return runMethod(registry, className, methodName, args);
}
