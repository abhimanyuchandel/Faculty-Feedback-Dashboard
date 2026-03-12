import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import {
  archiveTeachingSession,
  deleteTeachingSession,
  restoreTeachingSession
} from "@/services/session-service";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (body?.action === "archive") {
      const session = await archiveTeachingSession(id, admin.id);
      return ok({ session });
    }

    if (body?.action === "restore") {
      const session = await restoreTeachingSession(id, admin.id);
      return ok({ session });
    }

    return badRequest("action must be 'archive' or 'restore'");
  } catch (error) {
    console.error(error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return notFound("Session not found");
    }
    return serverError();
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    await deleteTeachingSession(id, admin.id);

    return ok({ ok: true });
  } catch (error) {
    console.error(error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return notFound("Session not found");
    }
    return serverError();
  }
}
