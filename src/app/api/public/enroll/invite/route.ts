import { AuditActorType } from "@prisma/client";
import { NextRequest } from "next/server";
import { badRequest, created, serverError, tooManyRequests } from "@/lib/http";
import { recordAuditLog } from "@/lib/audit";
import { enforceSimpleRateLimit } from "@/lib/rate-limit";
import { facultyEnrollmentInviteSchema } from "@/lib/validation/schemas";
import { sendFacultyEnrollmentInviteEmail } from "@/services/faculty-enrollment-service";

function clientIp(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = enforceSimpleRateLimit(`enroll-invite:${ip}`, { windowMs: 5 * 60_000, max: 5 });
    if (!rate.allowed) {
      return tooManyRequests(rate.retryAfterSeconds);
    }

    const body = await request.json();
    const parsed = facultyEnrollmentInviteSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid enrollment invite payload", parsed.error.flatten());
    }

    const result = await sendFacultyEnrollmentInviteEmail(parsed.data.primaryEmail);

    await recordAuditLog({
      actorType: AuditActorType.SYSTEM,
      action: "faculty.enrollment_invite_email",
      entityType: "faculty_enrollment_invite",
      metadata: {
        primaryEmail: result.primaryEmail,
        providerMessageId: result.providerMessageId
      }
    });

    return created({
      invited: true,
      message: "Enrollment email sent to the faculty member."
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return serverError(error.message);
    }
    return serverError();
  }
}
