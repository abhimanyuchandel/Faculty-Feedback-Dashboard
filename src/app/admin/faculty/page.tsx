import { FacultyAdminPanel } from "@/components/admin/faculty-admin";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function FacultyAdminPage() {
  await requireAdminPageSession("/admin/faculty");
  return <FacultyAdminPanel />;
}
