export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly context: unknown = {},
    public cause: unknown = undefined
  ) {
    super(JSON.stringify({ message, context, cause }));
    this.name = this.constructor.name || 'BaseError';
    this.makeErrorSerializable(this);
    if (cause instanceof Error) {
      this.makeErrorSerializable(cause);
    }
  }

  private makeErrorSerializable(err: Error): void {
    Object.defineProperty(err, 'stack', {
      enumerable: true,
    });
    Object.defineProperty(err, 'message', {
      enumerable: true,
    });
    Object.defineProperty(err, 'cause', {
      enumerable: true,
    });
  }
}

export class GenericError extends BaseError {}
export class InvalidArgument extends BaseError {}
export class InvariantError extends BaseError {}
