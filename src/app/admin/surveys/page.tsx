import { SurveyBuilderPanel } from "@/components/admin/survey-builder";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function SurveyBuilderPage() {
  await requireAdminPageSession("/admin/surveys");
  return <SurveyBuilderPanel />;
}
