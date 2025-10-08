export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly context: unknown = {},
    public cause: unknown = undefined
  ) {
    super(message);
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
