import bcrypt from "bcryptjs";
import { AuditActorType } from "@prisma/client";
import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { generateOpaqueToken, hashToken } from "@/lib/security";
import { recordAuditLog } from "@/lib/audit";

const RESET_TOKEN_TTL_MINUTES = 60;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function passwordResetEmailHtml(url: string): string {
  return `
    <p>A password reset was requested for your Department of Medicine faculty feedback admin account.</p>
    <p><a href="${url}">Reset your password</a></p>
    <p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
}

function passwordResetEmailText(url: string): string {
  return [
    "A password reset was requested for your Department of Medicine faculty feedback admin account.",
    `Reset your password: ${url}`,
    `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
    "If you did not request this, you can ignore this email."
  ].join("\n");
}

export async function requestAdminPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      activeStatus: true,
      passwordHash: true
    }
  });

  // Always return success semantics so account existence is not disclosed.
  if (!user || !user.activeStatus || !user.passwordHash) {
    return { requested: false as const, resetUrl: undefined };
  }

  const rawToken = generateOpaqueToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

  await prisma.adminPasswordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  const resetUrl = appUrl(`/admin/reset-password?token=${encodeURIComponent(rawToken)}`);

  await sendTransactionalEmail({
    to: user.email,
    subject: "Reset your Faculty Feedback admin password",
    html: passwordResetEmailHtml(resetUrl),
    text: passwordResetEmailText(resetUrl)
  });

  return {
    requested: true as const,
    resetUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl
  };
}

export async function resetAdminPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);

  const token = await prisma.adminPasswordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          activeStatus: true
        }
      }
    }
  });

  if (!token) {
    throw new Error("Invalid or expired reset token");
  }

  if (token.usedAt) {
    throw new Error("This reset token has already been used");
  }

  if (token.expiresAt < new Date()) {
    throw new Error("This reset token has expired");
  }

  if (!token.user.activeStatus) {
    throw new Error("Account is inactive");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: token.user.id },
      data: { passwordHash }
    });

    await tx.adminPasswordResetToken.updateMany({
      where: {
        userId: token.user.id,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });
  });

  await recordAuditLog({
    actorType: AuditActorType.SYSTEM,
    action: "admin.password_reset.complete",
    entityType: "admin_user",
    entityId: token.user.id,
    metadata: {
      email: token.user.email
    }
  });

  return {
    userId: token.user.id,
    email: token.user.email
  };
}
