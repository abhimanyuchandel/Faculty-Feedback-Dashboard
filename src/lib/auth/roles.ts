export function collapseAdminRoles(roleNames: string[]): string[] {
  // Treat legacy reporting assignments as administrators until the database is fully cleaned up.
  return roleNames.some((roleName) => roleName === "admin" || roleName === "reporting")
    ? ["admin"]
    : [];
}
