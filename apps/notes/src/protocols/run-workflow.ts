import { UniswapV2Workflows } from '@/protocols/workflows/UniswapV2Workflows.ts';
import { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';

export const protocolWorkflowsRegistry = {
  uniswapV2: await UniswapV2Workflows.create(new HardhatEvmLensHttpRL('http://localhost:4321', 'contracts')),
} as const;

export type ProtocolWorkflowsRegistry = typeof protocolWorkflowsRegistry;
export type MethodArgs<T, M extends keyof T> = T[M] extends (...args: infer A) => any ? A : never;
export type MethodReturn<T, M extends keyof T> = T[M] extends (...args: any[]) => infer R ? R : never;
export type WorkflowNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<ReadOnlyFunctionCallEvent | undefined> ? K : never;
}[keyof T];

export function runWorkflow<
  R extends Record<string, object> = ProtocolWorkflowsRegistry,
  P extends keyof R = keyof R,
  M extends WorkflowNames<R[P]> = WorkflowNames<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
>(registry: R, workflowClassName: P, workflowName: M, args?: A): MethodReturn<R[P], M> {
  const service = registry[workflowClassName];
  if (!service) {
    throw new Error(`No service found: "${String(workflowClassName)}"`);
  }

  const method = service[workflowName];
  if (typeof method !== 'function') {
    throw new Error(`No method "${String(workflowName)}" on "${String(workflowClassName)}"`);
  }

  return method.call(service, ...(args ?? []));
}
