import bcrypt from "bcryptjs";
import { badRequest, created, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { adminUserCreateSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const users = await prisma.user.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        activeStatus: true,
        mfaEnabled: true,
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
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        activeStatus: user.activeStatus,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt,
        roles: user.roles.map((entry) => entry.role.name)
      }))
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const body = await request.json();
    const parsed = adminUserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid admin user payload", parsed.error.flatten());
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true }
    });
    if (existing) {
      return badRequest("A user with that email already exists");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const createdUser = await prisma.$transaction(async (tx) => {
      const roleRows = await Promise.all(
        parsed.data.roles.map((roleName) =>
          tx.adminRole.upsert({
            where: { name: roleName },
            update: {},
            create: {
              name: roleName,
              description: roleName === "admin" ? "Full dashboard access" : "Read-only analytics and exports"
            }
          })
        )
      );

      return tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name?.trim() || null,
          passwordHash,
          activeStatus: true,
          roles: {
            create: roleRows.map((role) => ({
              roleId: role.id
            }))
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          activeStatus: true,
          mfaEnabled: true,
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
    });

    await recordAuditLog({
      adminUserId: admin.id,
      action: "admin.user.create",
      entityType: "admin_user",
      entityId: createdUser.id,
      metadata: {
        email: createdUser.email,
        roles: createdUser.roles.map((entry) => entry.role.name)
      }
    });

    return created({
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        activeStatus: createdUser.activeStatus,
        mfaEnabled: createdUser.mfaEnabled,
        lastLoginAt: createdUser.lastLoginAt,
        roles: createdUser.roles.map((entry) => entry.role.name)
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
