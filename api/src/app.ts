import express from "express";
import { AppError } from "./common/errors/appError.js";
import { errorHandler } from "./common/middlewares/errorHandler.js";
import { notFoundHandler } from "./common/middlewares/notFoundHandler.js";
import { validateRequest } from "./common/middlewares/validateRequest.js";

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
  res.json({ message: "API is running now" });
});

if (process.env.NODE_ENV !== "production") {
  app.get("/boom", () => {
    throw new AppError("Bad request", 400, "BAD_REQUEST", {
      field: "email",
      issue: "invalid format",
    });
  });

  app.post(
    "/signup",
    validateRequest(
      {
        body: (req) => {
          const errors: Array<{ field: string; issue: string }> = [];

          const body = req.body as Record<string, unknown>;
          if (typeof body?.email !== "string" || !body.email.includes("@")) {
            errors.push({ field: "email", issue: "invalid format" });
          }

          return errors;
        },
      },
      { errorCode: "AUTH_SIGNUP_VALIDATION_ERROR" }
    ),
    (_req, res) => {
      res.status(201).json({ ok: true });
    }
  );
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
