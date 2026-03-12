import { NextRequest } from "next/server";
import { badRequest, created, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { listSessions, createTeachingSession, updateSessionFaculty } from "@/services/session-service";
import { sessionCreateSchema } from "@/lib/validation/schemas";

function dateWithUtcTime(dateOnly: string, time: string) {
  return new Date(`${dateOnly}T${time}.000Z`);
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin", "reporting"])) {
      return forbidden();
    }

    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    const sessions = await listSessions(includeArchived);
    return ok({ sessions });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const body = await request.json();

    if (body.action === "updateFaculty") {
      if (typeof body.sessionId !== "string" || !Array.isArray(body.facultyIds)) {
        return badRequest("sessionId and facultyIds are required");
      }

      const session = await updateSessionFaculty(body.sessionId, body.facultyIds, admin.id);
      return ok({ session });
    }

    const parsed = sessionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid session payload", parsed.error.flatten());
    }

    const startAt = parsed.data.startAt
      ? new Date(parsed.data.startAt)
      : dateWithUtcTime(parsed.data.sessionDate, "00:00:00");
    const endAt = parsed.data.endAt
      ? new Date(parsed.data.endAt)
      : dateWithUtcTime(parsed.data.sessionDate, "23:59:59");

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return badRequest("Invalid session time values");
    }

    if (endAt <= startAt) {
      return badRequest("Session end time must be after start time");
    }

    const session = await createTeachingSession(
      {
        title: parsed.data.title,
        curriculumPhaseId: parsed.data.curriculumPhaseId,
        sessionDate: new Date(parsed.data.sessionDate),
        startAt,
        endAt,
        location: parsed.data.location,
        notes: parsed.data.notes,
        facultyIds: parsed.data.facultyIds
      },
      admin.id
    );

    return created({ session });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
