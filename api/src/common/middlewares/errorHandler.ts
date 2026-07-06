import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/appError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res) => {
  if (err instanceof AppError) {
    const payload: Record<string, unknown> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    };

    if (err.details !== undefined) {
      (payload.error as Record<string, unknown>).details = err.details;
    }

    res.status(err.statusCode).json(payload);
    return;
  }

  const statusCode =
    typeof (err as { statusCode?: number }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;

  const code =
    typeof (err as { code?: string }).code === "string"
      ? (err as { code: string }).code
      : "INTERNAL_SERVER_ERROR";

  const message = err instanceof Error ? err.message : "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      statusCode,
    },
  });
};
