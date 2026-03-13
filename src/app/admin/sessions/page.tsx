import { SessionAdminPanel } from "@/components/admin/session-admin";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function SessionsPage() {
  await requireAdminPageSession("/admin/sessions");
  return <SessionAdminPanel />;
}
