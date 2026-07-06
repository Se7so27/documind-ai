export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_SERVER_ERROR",
    details?: ErrorDetails,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
