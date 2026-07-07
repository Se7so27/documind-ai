import type { NextFunction, Request, Response } from "express";
import { registerTenantAndAdmin } from "./auth.service.js";

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await registerTenantAndAdmin(req.body);

    res.status(201).json({
      success: true,
      message: "Tenant and company admin created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
