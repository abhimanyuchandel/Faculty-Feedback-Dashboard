import { AuditActorType } from "@prisma/client";
import { NextRequest } from "next/server";
import { badRequest, created, ok, serverError, tooManyRequests } from "@/lib/http";
import { facultyEnrollmentRequestSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/audit";
import { enforceSimpleRateLimit } from "@/lib/rate-limit";
import { createFacultyEnrollmentRequest } from "@/services/faculty-enrollment-service";

function clientIp(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = enforceSimpleRateLimit(`enroll:${ip}`, { windowMs: 60_000, max: 10 });
    if (!rate.allowed) {
      return tooManyRequests(rate.retryAfterSeconds);
    }

    const body = await request.json();
    const parsed = facultyEnrollmentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid enrollment request payload", parsed.error.flatten());
    }

    const result = await createFacultyEnrollmentRequest({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      primaryEmail: parsed.data.primaryEmail,
      secondaryEmail: parsed.data.secondaryEmail || undefined,
      notes: parsed.data.notes || undefined
    });

    if (result.alreadyEnrolled) {
      return ok({
        requested: false,
        alreadyEnrolled: true,
        message: "This faculty member is already enrolled for feedback."
      });
    }

    if (!result.requested) {
      return ok({
        requested: false,
        alreadyPending: true,
        message: "An enrollment request for this faculty member is already pending admin review."
      });
    }

    await recordAuditLog({
      actorType: AuditActorType.SYSTEM,
      action: "faculty.enrollment_request",
      entityType: "faculty_enrollment_request",
      entityId: result.request.id,
      metadata: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        primaryEmail: parsed.data.primaryEmail,
        secondaryEmail: parsed.data.secondaryEmail?.trim() || null,
        notes: parsed.data.notes?.trim() || null
      }
    });

    return created({
      requested: true,
      message: "Enrollment request submitted. An administrator will review it."
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
