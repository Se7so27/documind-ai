import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { VALIDATION_ERROR } from "../../common/errors/errorCodes.js";
import type { RegisterInput } from "./auth.types.js";

const registerSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, "companyName must be at least 2 characters")
      .max(120, "companyName must be at most 120 characters")
      .regex(/^[\p{L}\p{N}\s'&.()-]+$/u, "companyName contains invalid characters"),
    companySlug: z.string().trim().max(80).optional(),
    adminName: z
      .string()
      .trim()
      .min(2, "adminName must be at least 2 characters")
      .max(120, "adminName must be at most 120 characters"),
    email: z.string().trim().toLowerCase().email("email must be a valid address"),
    password: z
      .string()
      .min(8, "password must be at least 8 characters")
      .max(128, "password must be at most 128 characters")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "password must contain at least one letter and one number"),
  })
  .strict();

export function validateRegisterInput(input: unknown): RegisterInput {
  const result = registerSchema.safeParse(input);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      issue: issue.message,
    }));

    throw new AppError(400, VALIDATION_ERROR, "Validation failed", { errors });
  }

  return result.data;
}
