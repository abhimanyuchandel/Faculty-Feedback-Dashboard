import { auth } from "@/auth";
import { collapseAdminRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

async function resolveAuthenticatedAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
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
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles
    }
  };
}

export async function requireAdminSession(requiredRoles?: string[]) {
  const session = await resolveAuthenticatedAdmin();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!requiredRoles || requiredRoles.length === 0) {
    return session;
  }

  const userRoles = new Set(session.user.roles ?? []);
  const hasRole = requiredRoles.some((role) => userRoles.has(role));

  if (!hasRole) {
    throw new Error("Forbidden");
  }

  return session;
}

export async function requireAdminPageSession(callbackPath: string, requiredRoles?: string[]) {
  const session = await resolveAuthenticatedAdmin();

  if (!session?.user) {
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (!requiredRoles || requiredRoles.length === 0) {
    return session;
  }

  const userRoles = new Set(session.user.roles ?? []);
  const hasRole = requiredRoles.some((role) => userRoles.has(role));

  if (!hasRole) {
    throw new Error("Forbidden");
  }

  return session;
}
