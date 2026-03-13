import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAdminSession(requiredRoles?: string[]) {
  const session = await auth();

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
  const session = await auth();

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
