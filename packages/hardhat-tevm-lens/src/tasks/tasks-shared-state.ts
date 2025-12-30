import type { FunctionIndexes } from './index-functions/types';

export type TasksSharedState = {
  functionIndexes: FunctionIndexes;
};

let complexState: TasksSharedState = {
  functionIndexes: [],
};

export function setSharedState(value: TasksSharedState) {
  complexState = value;
}

export function getSharedState(): TasksSharedState {
  if (!complexState) throw new Error('Complex state not initialized');
  return complexState;
}
