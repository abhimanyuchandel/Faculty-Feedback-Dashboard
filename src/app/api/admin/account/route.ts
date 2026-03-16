import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isMfaAvailable } from "@/lib/mfa";

export async function GET() {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const user = await prisma.user.findUnique({
      where: { id: admin.id },
      select: {
        id: true,
        email: true,
        name: true,
        mfaEnabled: true,
        activeStatus: true,
        lastLoginAt: true,
        roles: {
          include: {
            role: {
              select: { name: true }
            }
          }
        }
      }
    });

    return ok({
      user: user
        ? {
            ...user,
            roles: ["admin"],
            mfaSetupAvailable: isMfaAvailable()
          }
        : null
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const body = (await request.json()) as {
      currentPassword?: string;
      email?: string;
      name?: string;
      newPassword?: string;
    };

    const user = await prisma.user.findUnique({ where: { id: admin.id } });
    if (!user || !user.passwordHash) {
      return unauthorized("Account is not configured for password sign-in");
    }

    if (!body.currentPassword) {
      return badRequest("currentPassword is required");
    }

    const currentPasswordValid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      return unauthorized("Current password is incorrect");
    }

    const updates: {
      email?: string;
      name?: string | null;
      passwordHash?: string;
    } = {};

    if (body.email && body.email.toLowerCase() !== user.email) {
      updates.email = body.email.toLowerCase();
    }

    if (typeof body.name === "string" && body.name !== (user.name ?? "")) {
      updates.name = body.name.trim() || null;
    }

    if (body.newPassword) {
      if (body.newPassword.length < 10) {
        return badRequest("newPassword must be at least 10 characters");
      }
      updates.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No profile changes supplied");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        mfaEnabled: true,
        activeStatus: true,
        lastLoginAt: true,
        roles: {
          include: {
            role: {
              select: { name: true }
            }
          }
        }
      }
    });

    await recordAuditLog({
      adminUserId: user.id,
      action: "admin.account.update_credentials",
      entityType: "admin_user",
      entityId: user.id,
      metadata: {
        emailChanged: Boolean(updates.email),
        passwordChanged: Boolean(updates.passwordHash),
        nameChanged: "name" in updates
      }
    });

    return ok({
      user: {
        ...updated,
        roles: ["admin"],
        mfaSetupAvailable: isMfaAvailable()
      }
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return badRequest("That email is already in use");
    }
    return serverError();
  }
}
