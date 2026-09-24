export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: {
      fields?: Record<string, string>;
      booking?: {
        id: string;
        startTime: string;
        manageUrl: string;
      };
      [key: string]: unknown;
    };
    booking?: {
      id: string;
      startTime: string;
      manageUrl: string;
    };
  };
  code?: string;
  message?: string;
  booking?: {
    id: string;
    startTime: string;
    manageUrl: string;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.error.message);
    this.name = "ApiError";
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    typeof (error as { message: unknown }).message === "string"
  );
}

export function fieldErrors(error: ApiError): Record<string, string> {
  return error.body.error.details?.fields ?? {};
}

export function getExistingBookingFromError(error: ApiError): {
  id: string;
  startTime: string;
  manageUrl: string;
} | undefined {
  return (
    error.body.booking ||
    error.body.error.booking ||
    error.body.error.details?.booking
  );
}
