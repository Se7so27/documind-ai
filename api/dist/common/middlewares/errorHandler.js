import { AppError } from "../errors/appError.js";
export const errorHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        const payload = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                statusCode: err.statusCode,
            },
        };
        if (err.details !== undefined) {
            payload.error.details = err.details;
        }
        res.status(err.statusCode).json(payload);
        return;
    }
    const statusCode = typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
    const code = typeof err.code === "string"
        ? err.code
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
