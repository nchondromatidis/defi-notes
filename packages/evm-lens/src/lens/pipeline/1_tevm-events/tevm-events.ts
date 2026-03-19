import type { Message } from 'tevm/actions';
import type { EvmResult, InterpreterStep } from 'tevm/evm';

export type TEvmEvent = Message | EvmResult | InterpreterStep;

const isRecord = (v: unknown): v is Record<PropertyKey, unknown> => typeof v === 'object' && v !== null;

export function isMessage(event: unknown): event is Message {
  return isRecord(event) && 'value' in event;
}

export function isEvmResult(event: unknown): event is EvmResult {
  return isRecord(event) && 'execResult' in event;
}

export function isInterpreterStep(event: unknown): event is InterpreterStep {
  return isRecord(event) && 'opcode' in event;
}
