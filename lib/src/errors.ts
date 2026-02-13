import { logger } from 'lib/src/logging/server.js';

export class AppError extends Error {
  constructor(
    public readonly description: string,
    public readonly code = 'APP_ERROR',
    public readonly data?: Record<string, unknown>
  ) {
    super(description);

    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

    Error.captureStackTrace(this);
  }
}

export class ForbiddenError extends AppError {
  public static readonly code: string = 'FORBIDDEN';
  public static readonly statusCode: number = 403;
  public static readonly message: string = 'Forbidden.';

  constructor(
    public readonly message = ForbiddenError.message,
    public readonly code = ForbiddenError.code,
    public readonly statusCode = ForbiddenError.statusCode
  ) {
    super(message, code);
  }
}

export class NotFoundError extends AppError {
  public static readonly code: string = 'NOT_FOUND';
  public static readonly statusCode: number = 404;
  public static readonly message: string = 'Not found.';

  constructor(
    public readonly message = NotFoundError.message,
    public readonly code = NotFoundError.code,
    public readonly statusCode = NotFoundError.statusCode
  ) {
    super(message, code);
  }
}

export class UnauthorizedError extends AppError {
  public static readonly code: string = 'UNAUTHORIZED';
  public static readonly statusCode: number = 401;
  public static readonly message: string = 'Unauthorized.';

  constructor(
    public readonly message = UnauthorizedError.message,
    public readonly code = UnauthorizedError.code,
    public readonly statusCode = UnauthorizedError.statusCode
  ) {
    super(message, code);
  }
}

export class ValidationError extends AppError {
  public static readonly code: string = 'VALIDATION_ERROR';
  public static readonly statusCode: number = 400;
  public static readonly message: string = 'Data is not valid.';
  public static readonly data: Record<string, unknown> = {};

  constructor(
    public readonly message = ValidationError.message,
    public readonly code = ValidationError.code,
    public readonly statusCode = ValidationError.statusCode,
    public readonly data = ValidationError.data
  ) {
    super(message, code, data);
  }
}

export class ErrorsHandler {
  public handleProcessErrors(callback?: (error: unknown) => void) {
    process.on('unhandledRejection', (reason) => {
      logger.error(reason);
      callback?.(reason);
    });
    process.on('uncaughtException', (error) => {
      logger.error(error);
      callback?.(error);
    });
  }
}

export function tryCatch<T>(mainFn: () => T): T | undefined;
export function tryCatch<T, ET>(mainFn: () => T, errorFn: (error: Error) => ET): T | ET;
export function tryCatch<T, ET>(mainFn: () => T, errorFn?: (error: Error) => ET): T | ET | undefined {
  try {
    return mainFn();
  } catch (error) {
    return errorFn?.(error as Error);
  }
}

export const errorsHandler = new ErrorsHandler();
