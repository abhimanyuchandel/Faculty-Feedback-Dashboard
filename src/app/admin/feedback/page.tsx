import { FeedbackReviewPanel } from "@/components/admin/feedback-review";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function FeedbackPage() {
  await requireAdminPageSession("/admin/feedback");
  return <FeedbackReviewPanel />;
}
