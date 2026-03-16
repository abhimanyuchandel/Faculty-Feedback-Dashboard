import { auth } from "@/auth";
import { collapseAdminRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";

export async function getApiAdminUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

  if (!user || !user.activeStatus) {
    return null;
  }

  const roles = collapseAdminRoles(user.roles.map((entry) => entry.role.name));
  if (roles.length === 0) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    roles
  };
}

export function hasAnyRole(user: { roles: string[] }, required: string[]): boolean {
  const roleSet = new Set(user.roles);
  return required.some((role) => roleSet.has(role));
}
