export class AppError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details, options) {
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
