import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import {
  createMfaSetup,
  decryptMfaSecret,
  encryptMfaSecret,
  isMfaAvailable,
  verifyTotpCode
} from "@/lib/mfa";
import { recordAuditLog } from "@/lib/audit";

async function getAuthenticatedUser() {
  const admin = await getApiAdminUser();
  if (!admin) {
    return { error: unauthorized() };
  }

  if (!hasAnyRole(admin, ["admin"])) {
    return { error: forbidden() };
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user || !user.passwordHash) {
    return { error: unauthorized("Account is not configured for password sign-in") };
  }

  return { admin, user };
}

export async function POST(request: NextRequest) {
  try {
    if (!isMfaAvailable()) {
      return badRequest("MFA is not configured for this deployment");
    }

    const authResult = await getAuthenticatedUser();
    if ("error" in authResult) {
      return authResult.error;
    }

    const body = (await request.json()) as {
      action?: "start" | "enable" | "disable";
      currentPassword?: string;
      code?: string;
    };

    if (!body.currentPassword) {
      return badRequest("currentPassword is required");
    }

    const passwordHash = authResult.user.passwordHash;
    if (!passwordHash) {
      return unauthorized("Account is not configured for password sign-in");
    }

    const passwordOk = await bcrypt.compare(body.currentPassword, passwordHash);
    if (!passwordOk) {
      return unauthorized("Current password is incorrect");
    }

    if (body.action === "start") {
      const setup = await createMfaSetup(authResult.user.email);
      await prisma.user.update({
        where: { id: authResult.user.id },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: encryptMfaSecret(setup.secret)
        }
      });

      await recordAuditLog({
        adminUserId: authResult.user.id,
        action: "admin.account.mfa_setup_started",
        entityType: "admin_user",
        entityId: authResult.user.id
      });

      return ok({
        mfaEnabled: false,
        setup
      });
    }

    if (body.action === "enable") {
      if (!body.code) {
        return badRequest("code is required");
      }

      if (!authResult.user.mfaSecretEncrypted) {
        return badRequest("Start MFA setup before enabling it");
      }

      const secret = decryptMfaSecret(authResult.user.mfaSecretEncrypted);
      if (!verifyTotpCode(secret, body.code)) {
        return badRequest("Invalid MFA code");
      }

      await prisma.user.update({
        where: { id: authResult.user.id },
        data: { mfaEnabled: true }
      });

      await recordAuditLog({
        adminUserId: authResult.user.id,
        action: "admin.account.mfa_enabled",
        entityType: "admin_user",
        entityId: authResult.user.id
      });

      return ok({ mfaEnabled: true });
    }

    if (body.action === "disable") {
      if (!body.code) {
        return badRequest("code is required");
      }

      if (!authResult.user.mfaEnabled || !authResult.user.mfaSecretEncrypted) {
        return badRequest("MFA is not enabled");
      }

      const secret = decryptMfaSecret(authResult.user.mfaSecretEncrypted);
      if (!verifyTotpCode(secret, body.code)) {
        return badRequest("Invalid MFA code");
      }

      await prisma.user.update({
        where: { id: authResult.user.id },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null
        }
      });

      await recordAuditLog({
        adminUserId: authResult.user.id,
        action: "admin.account.mfa_disabled",
        entityType: "admin_user",
        entityId: authResult.user.id
      });

      return ok({ mfaEnabled: false });
    }

    return badRequest("Invalid MFA action");
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
