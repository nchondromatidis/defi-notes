export type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type MethodArgs<T, M extends keyof T> = T[M] extends (...args: infer A) => any ? A : never;

export type MethodReturn<T, M extends keyof T> = T[M] extends (...args: any[]) => infer R ? R : never;

export function runMethod<
  R extends Record<string, object>,
  P extends keyof R = keyof R,
  M extends MethodKeys<R[P]> = MethodKeys<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
>(registry: R, className: P, methodName: M, args?: A): MethodReturn<R[P], M> {
  const service = registry[className];
  if (!service) {
    throw new Error(`No service found: "${String(className)}"`);
  }

  const method = service[methodName];
  if (typeof method !== 'function') {
    throw new Error(`No method "${String(methodName)}" on "${String(className)}"`);
  }

  return method.call(service, ...(args ?? []));
}
