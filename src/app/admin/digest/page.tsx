import { DigestAdminPanel } from "@/components/admin/digest-admin";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function DigestPage() {
  await requireAdminPageSession("/admin/digest");
  return <DigestAdminPanel />;
}
