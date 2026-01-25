import { type Hex, isHex } from 'viem';

type Ok<T> = { ok: true; value: T };
type Err<E = unknown> = { ok: false; error: E };
type Result<T, E = unknown> = Ok<T> | Err<E>;

export async function tryAsync<T, E = unknown>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error as E };
  }
}

export function trySync<T, E = unknown>(fn: () => T): Result<T, E> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error as E };
  }
}

export type DeepReadonly<T> =
  T extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export function safeCastToHex(value: string): Hex {
  if (!isHex(value)) throw new Error(`Invalid hex string: ${value}`);
  return value;
}
