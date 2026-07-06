import { AppError } from "../errors/appError.js";
export function notFoundHandler(_req, _res, next) {
    next(new AppError("Route not found", 404, "NOT_FOUND"));
}
