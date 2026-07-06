import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

process.env.NODE_ENV = "test";

import app from "./app.js";

test("returns a standardized error envelope for handled errors", async () => {
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/boom`);
    const body = (await response.json()) as {
      success: boolean;
      error: {
        code: string;
        message: string;
        statusCode: number;
        details?: { field: string; issue: string };
      };
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "BAD_REQUEST");
    assert.equal(body.error.message, "Bad request");
    assert.equal(body.error.statusCode, 400);
    assert.deepEqual(body.error.details, {
      field: "email",
      issue: "invalid format",
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test("returns a standardized 404 envelope for unknown routes", async () => {
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/does-not-exist`);
    const body = (await response.json()) as {
      success: boolean;
      error: {
        code: string;
        message: string;
        statusCode: number;
      };
    };

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NOT_FOUND");
    assert.equal(body.error.message, "Route not found");
    assert.equal(body.error.statusCode, 404);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test("returns a standardized validation error envelope with a route-specific code", async () => {
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/signup`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "invalid" }),
    });
    const body = (await response.json()) as {
      success: boolean;
      error: {
        code: string;
        message: string;
        statusCode: number;
        details?: { errors: Array<{ field: string; issue: string }> };
      };
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "AUTH_SIGNUP_VALIDATION_ERROR");
    assert.equal(body.error.message, "Validation failed");
    assert.equal(body.error.statusCode, 400);
    assert.deepEqual(body.error.details, {
      errors: [{ field: "email", issue: "invalid format" }],
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
