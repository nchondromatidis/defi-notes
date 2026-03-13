import { UniswapV2Workflows } from '@/protocols/workflows/UniswapV2Workflows.ts';
import { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/handlers/FunctionTrace.ts';

// TODO: remove singleton, not an issue yet because of astros-js-islands
export const protocolWorkflowsRegistry = {
  uniswapV2: await UniswapV2Workflows.create(new HardhatEvmLensHttpRL('http://localhost:4321', 'contracts')),
} as const;

type HasTrace = {
  trace: ReadOnlyFunctionCallEvent | undefined;
};

export type ProtocolWorkflowsRegistry = typeof protocolWorkflowsRegistry;
export type MethodArgs<T, M extends keyof T> = T[M] extends (...args: infer A) => any ? A : never;
export type MethodReturn<T, M extends keyof T> = T[M] extends (...args: any[]) => infer R ? R : never;
export type WorkflowNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<HasTrace> ? K : never;
}[keyof T];

export async function runWorkflow<
  R extends Record<string, object> = ProtocolWorkflowsRegistry,
  P extends keyof R = keyof R,
  M extends WorkflowNames<R[P]> = WorkflowNames<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
>(registry: R, workflowClassName: P, workflowName: M, args?: A): Promise<MethodReturn<R[P], M>> {
  const service = registry[workflowClassName];
  if (!service) {
    throw new Error(`No service found: "${String(workflowClassName)}"`);
  }

  const method = service[workflowName];
  if (typeof method !== 'function') {
    throw new Error(`No method "${String(workflowName)}" on "${String(workflowClassName)}"`);
  }

  return await method.call(service, ...(args ?? []));
}
