import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { runAutomatedDigestCycle, sendDigestForFaculty } from "@/services/digest-service";
import { DigestRunType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const body = await request.json().catch(() => ({}));

    if (body?.facultyId) {
      if (typeof body.facultyId !== "string") {
        return badRequest("facultyId must be a string");
      }

      const result = await sendDigestForFaculty(body.facultyId, {
        runType: DigestRunType.TEST,
        createdByAdminId: admin.id
      });

      return ok({ result });
    }

    const result = await runAutomatedDigestCycle();
    return ok(result);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
