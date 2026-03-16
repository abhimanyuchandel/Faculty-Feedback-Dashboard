import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { collapseAdminRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;

    if (id === admin.id) {
      return badRequest("You cannot remove your own admin account.");
    }

    const deletedUser = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          activeStatus: true,
          roles: {
            include: {
              role: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!target) {
        return null;
      }

      const roleNames = target.roles.map((entry) => entry.role.name);
      const effectiveRoles = collapseAdminRoles(roleNames);

      if (effectiveRoles.includes("admin")) {
        const otherActiveAdminCount = await tx.user.count({
          where: {
            id: { not: target.id },
            activeStatus: true,
            roles: {
              some: {
                role: {
                  // Count legacy reporting assignments as administrators during the role transition.
                  name: {
                    in: ["admin", "reporting"]
                  }
                }
              }
            }
          }
        });

        if (otherActiveAdminCount === 0) {
          throw new Error("You cannot remove the last active admin user.");
        }
      }

      await tx.user.delete({
        where: { id: target.id }
      });

      return {
        id: target.id,
        email: target.email,
        roles: effectiveRoles
      };
    });

    if (!deletedUser) {
      return notFound("Admin user not found.");
    }

    await recordAuditLog({
      adminUserId: admin.id,
      action: "admin.user.delete",
      entityType: "admin_user",
      entityId: deletedUser.id,
      metadata: {
        email: deletedUser.email,
        roles: deletedUser.roles
      }
    });

    return ok({
      ok: true,
      deletedUser
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
