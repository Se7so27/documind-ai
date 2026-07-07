import crypto from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../common/errors/AppError.js";
import {
  EMAIL_ALREADY_EXISTS,
  REGISTRATION_FAILED,
  TENANT_ALREADY_EXISTS,
} from "../../common/errors/errorCodes.js";
import type { RegisterResult, RegisterInput } from "./auth.types.js";
import {
  createTenant,
  createUser,
  deleteTenantById,
  findTenantBySlug,
  findUserByEmail,
} from "./auth.repository.js";
import { validateRegisterInput } from "./auth.validator.js";

type CreatedTenantRecord = {
  _id: { toString(): string };
  id?: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  createdAt?: Date;
};

type CreatedUserRecord = {
  _id: { toString(): string };
  id?: string;
  tenantId: unknown;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: Date;
};

function normalizeSlug(companySlug: string | undefined, companyName: string) {
  const candidate = (companySlug ?? companyName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    candidate ||
    companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
  );
}

function serializeTenant(tenant: CreatedTenantRecord) {
  return {
    id: tenant.id ?? tenant._id.toString(),
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    plan: tenant.plan,
    createdAt: tenant.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

function serializeUser(user: CreatedUserRecord) {
  return {
    id: user.id ?? user._id.toString(),
    tenantId: user.tenantId?.toString() ?? "",
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function registerTenantAndAdmin(
  input: unknown
): Promise<RegisterResult> {
  const payload = validateRegisterInput(input);

  const normalizedEmail = payload.email.toLowerCase().trim();
  const normalizedSlug = normalizeSlug(payload.companySlug, payload.companyName);

  const tenantExists = await findTenantBySlug(normalizedSlug);

  if (tenantExists) {
    throw new AppError(409, TENANT_ALREADY_EXISTS, "Tenant already exists");
  }

  const userExists = await findUserByEmail(normalizedEmail);

  if (userExists) {
    throw new AppError(409, EMAIL_ALREADY_EXISTS, "Email already registered");
  }

  const passwordHash = hashPassword(payload.password);

  const tenantPayload = {
    name: payload.companyName.trim(),
    slug: normalizedSlug,
    status: "active",
    plan: "free",
  };

  const userPayload = {
    tenantId: "",
    name: payload.adminName.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "COMPANY_ADMIN",
    status: "active",
  };

  const created: {
    tenant: CreatedTenantRecord | null;
    user: CreatedUserRecord | null;
  } = {
    tenant: null,
    user: null,
  };

  const session = await mongoose.startSession();

  try {
    try {
      await session.withTransaction(async () => {
        created.tenant = await createTenant(tenantPayload, session);

        userPayload.tenantId = created.tenant._id.toString();

        created.user = await createUser(userPayload, session);
      });
    } catch (error) {
      const isTransactionUnsupported =
        error instanceof Error && /replica set|transaction/i.test(error.message);

      if (isTransactionUnsupported || error instanceof Error) {
        created.tenant = await createTenant(tenantPayload);

        userPayload.tenantId = created.tenant._id.toString();

        created.user = await createUser(userPayload);
      } else {
        throw error;
      }
    }

    if (!created.tenant || !created.user) {
      throw new AppError(500, REGISTRATION_FAILED, "Registration failed");
    }

    return {
      tenant: serializeTenant(created.tenant),
      user: serializeUser(created.user),
    };
  } catch (error) {
    if (created.tenant && !created.user) {
      const tenantId = created.tenant._id.toString();

      await deleteTenantById(tenantId);
    }

    if (isDuplicateKeyError(error)) {
      if (error && typeof error === "object" && "keyPattern" in error) {
        const keyPattern = error.keyPattern as Record<string, unknown>;

        if (keyPattern.slug) {
          throw new AppError(409, TENANT_ALREADY_EXISTS, "Tenant already exists");
        }

        if (keyPattern.email) {
          throw new AppError(409, EMAIL_ALREADY_EXISTS, "Email already registered");
        }
      }

      throw new AppError(409, EMAIL_ALREADY_EXISTS, "Email already registered");
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(500, REGISTRATION_FAILED, "Registration failed");
  } finally {
    await session.endSession();
  }
}

export function createRegisterPayload(input: RegisterInput) {
  return {
    companyName: input.companyName,
    companySlug: input.companySlug,
    adminName: input.adminName,
    email: input.email,
    password: input.password,
  };
}