export type ErrorDetails = {
  fields?: Record<string, string>;
};

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly details: ErrorDetails = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, 400, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetails, message = "Request validation failed") {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, 409, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, 503, details);
  }
}
