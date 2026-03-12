import { auth } from "@/auth";

export async function getApiAdminUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    roles: session.user.roles ?? []
  };
}

export function hasAnyRole(user: { roles: string[] }, required: string[]): boolean {
  const roleSet = new Set(user.roles);
  return required.some((role) => roleSet.has(role));
}
