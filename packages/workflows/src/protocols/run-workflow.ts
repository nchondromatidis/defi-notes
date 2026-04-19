import { UniswapV2Workflows } from './workflows/UniswapV2Workflows.ts';
import { HardhatEvmLensHttpRL } from '@protocol-lens/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';
import type { ReadOnlyFunctionCallEvent } from '@protocol-lens/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';

export type ProtocolWorkflowsRegistryType = {
  uniswapV2: UniswapV2Workflows;
};

// Singleton instance - lazily initialized
let protocolWorkflowsRegistryInstance: ProtocolWorkflowsRegistryType | null = null;

export async function getProtocolWorkflowsRegistry(
  resourcesUri: string,
  contractsFolder: string
): Promise<ProtocolWorkflowsRegistryType> {
  if (protocolWorkflowsRegistryInstance) {
    return protocolWorkflowsRegistryInstance;
  }

  protocolWorkflowsRegistryInstance = {
    uniswapV2: await UniswapV2Workflows.create(new HardhatEvmLensHttpRL(resourcesUri, contractsFolder)),
  };

  return protocolWorkflowsRegistryInstance;
}

type HasTrace = {
  trace: ReadOnlyFunctionCallEvent | undefined;
};

export type ProtocolWorkflowsRegistry = ProtocolWorkflowsRegistryType;
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
