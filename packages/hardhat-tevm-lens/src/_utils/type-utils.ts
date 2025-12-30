type Ok<T> = { ok: true; value: T };
type Err<E = unknown> = { ok: false; error: E };
type Result<T, E = unknown> = Ok<T> | Err<E>;

export function trySync<T, E = unknown>(fn: () => T): Result<T, E> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error as E };
  }
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
