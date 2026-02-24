import { UniswapV2Workflows } from '@/workflows/protocols/UniswapV2Workflows.ts';
import { type MethodArgs, type MethodKeys, type MethodReturn, runMethod } from '@/utils/run-method.ts';
import { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';
import { ProtocolWorkflowBaseBase } from '@/workflows/protocols/ProtocolWorkflowBase.ts';

export const protocolWorkflowRegistry = {
  uniswapV2: await UniswapV2Workflows.create(new HardhatEvmLensHttpRL('http://localhost:4321', 'contracts')),
} as const;

export type ProtocolWorkflowRegistry = typeof protocolWorkflowRegistry;

export type WorkflowMethodKeys<T> = Exclude<MethodKeys<T>, 'deploy' | 'getProjectFiles' | 'toTraceResult'>;

export function runWorkflow<
  R extends Record<string, object> = ProtocolWorkflowRegistry,
  P extends keyof R = keyof R,
  M extends WorkflowMethodKeys<R[P]> = WorkflowMethodKeys<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
>(registry: R, className: P, methodName: M, args?: A): MethodReturn<R[P], M> {
  return runMethod(registry, className, methodName, args);
}

runWorkflow(protocolWorkflowRegistry, 'uniswapV2', 'createPair');
