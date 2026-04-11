export interface AppErrorOptions extends ErrorOptions {
  code?: string;
  httpCode?: number;
  data?: Record<string, unknown>;
}

export class AppError extends Error {
  code: string = 'APP_ERROR';
  httpCode: number = 500;
  data: Record<string, unknown> = {};

  constructor(message?: string, options?: AppErrorOptions) {
    super(message, { ...options, cause: options?.cause });
    this.code = options?.code ?? this.code;
    this.httpCode = options?.httpCode ?? this.httpCode;
    this.data = options?.data ?? this.data;

    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

    Error.captureStackTrace(this);
  }
}

export class ForbiddenError extends AppError {
  code: string = 'FORBIDDEN';
  httpCode: number = 403;
}

export class NotFoundError extends AppError {
  code: string = 'NOT_FOUND';
  httpCode: number = 404;
}

export class UnauthorizedError extends AppError {
  code: string = 'UNAUTHORIZED';
  httpCode: number = 401;
}

export class ValidationError extends AppError {
  code: string = 'VALIDATION_ERROR';
  httpCode: number = 400;
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
