import { AccountSettingsPanel } from "@/components/admin/account-settings";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function AccountPage() {
  await requireAdminPageSession("/admin/account");
  return <AccountSettingsPanel />;
}
