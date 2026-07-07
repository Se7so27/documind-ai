import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";

import app from "./app.js";
import { connectDB } from "./db/connection.js";
import TenantModel from "./db/models/tenant.model.js";
import UserModel from "./db/models/user.model.js";

function createServer() {
  return new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
}

function closeServer(server: ReturnType<typeof app.listen>) {
  return new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

before(async () => {
  await connectDB();
});

beforeEach(async () => {
  await TenantModel.deleteMany({});
  await UserModel.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
});

test("registers a tenant and first company admin", async () => {
  const server = await createServer();

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Acme Consulting",
        companySlug: "acme-consulting",
        adminName: "Sarah Ahmed",
        email: "sarah@acme.com",
        password: "StrongPass123!",
      }),
    });
    const body = (await response.json()) as {
      success: boolean;
      data: {
        tenant: { id: string; name: string; slug: string; status: string; plan: string };
        user: { id: string; tenantId: string; name: string; email: string; role: string; status: string };
      };
    };

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.tenant.name, "Acme Consulting");
    assert.equal(body.data.tenant.slug, "acme-consulting");
    assert.equal(body.data.user.role, "COMPANY_ADMIN");
    assert.equal(body.data.user.email, "sarah@acme.com");
    assert.equal(typeof body.data.user.tenantId, "string");
    assert.equal("passwordHash" in body.data.user, false);
  } finally {
    await closeServer(server);
  }
});

test("rejects missing companyName", async () => {
  const server = await createServer();

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companySlug: "acme-consulting",
        adminName: "Sarah Ahmed",
        email: "sarah@acme.com",
        password: "StrongPass123!",
      }),
    });
    const body = (await response.json()) as { success: boolean; error: { code: string } };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  } finally {
    await closeServer(server);
  }
});

test("rejects duplicate tenant slugs", async () => {
  const server = await createServer();

  try {
    const address = server.address() as AddressInfo;
    const first = await fetch(`http://127.0.0.1:${address.port}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Acme Consulting",
        companySlug: "acme-consulting",
        adminName: "Sarah Ahmed",
        email: "sarah@acme.com",
        password: "StrongPass123!",
      }),
    });
    const second = await fetch(`http://127.0.0.1:${address.port}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Acme Consulting",
        companySlug: "acme-consulting",
        adminName: "Jane Smith",
        email: "jane@acme.com",
        password: "StrongPass123!",
      }),
    });

    assert.equal(first.status, 201);
    assert.equal(second.status, 409);
    const body = (await second.json()) as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, "TENANT_ALREADY_EXISTS");
  } finally {
    await closeServer(server);
  }
});

test("returns a standardized error envelope for handled errors", async () => {
  const server = await createServer();

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/boom`);
    const body = (await response.json()) as {
      success: boolean;
      error: {
        code: string;
        message: string;
        details: { field: string; issue: string } | null;
        path: string;
        method: string;
        timestamp: string;
      };
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "BAD_REQUEST");
    assert.equal(body.error.message, "Bad request");
    assert.deepEqual(body.error.details, {
      field: "email",
      issue: "invalid format",
    });
    assert.equal(body.error.path, "/boom");
    assert.equal(body.error.method, "GET");
    assert.match(body.error.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await closeServer(server);
  }
});

test("returns a standardized 404 envelope for unknown routes", async () => {
  const server = await createServer();

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/does-not-exist`);
    const body = (await response.json()) as {
      success: boolean;
      error: {
        code: string;
        message: string;
        details: null;
        path: string;
        method: string;
        timestamp: string;
      };
    };

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NOT_FOUND");
    assert.equal(body.error.message, "Route not found");
    assert.equal(body.error.details, null);
    assert.equal(body.error.path, "/does-not-exist");
    assert.equal(body.error.method, "GET");
    assert.match(body.error.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await closeServer(server);
  }
});

test("returns a standardized validation error envelope with a route-specific code", async () => {
  const server = await createServer();

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
        details: { errors: Array<{ field: string; issue: string }> } | null;
        path: string;
        method: string;
        timestamp: string;
      };
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "AUTH_SIGNUP_VALIDATION_ERROR");
    assert.equal(body.error.message, "Validation failed");
    assert.deepEqual(body.error.details, {
      errors: [{ field: "email", issue: "invalid format" }],
    });
    assert.equal(body.error.path, "/signup");
    assert.equal(body.error.method, "POST");
    assert.match(body.error.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await closeServer(server);
  }
});

test("returns a standardized 400 envelope for malformed JSON", async () => {
  const server = await createServer();

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/signup`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: '{"brokenJson":',
    });
    const body = (await response.json()) as {
      success: boolean;
      error: {
        code: string;
        message: string;
        details: null;
        path: string;
        method: string;
        timestamp: string;
      };
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "BAD_REQUEST");
    assert.equal(body.error.message, "Invalid JSON payload");
    assert.equal(body.error.details, null);
    assert.equal(body.error.path, "/signup");
    assert.equal(body.error.method, "POST");
    assert.match(body.error.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await closeServer(server);
  }
});
