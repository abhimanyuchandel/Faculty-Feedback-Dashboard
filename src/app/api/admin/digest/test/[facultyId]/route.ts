import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { sendDigestForFaculty } from "@/services/digest-service";
import { DigestRunType } from "@prisma/client";

export async function POST(request: NextRequest, context: { params: Promise<{ facultyId: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { facultyId } = await context.params;
    const result = await sendDigestForFaculty(facultyId, {
      runType: DigestRunType.TEST,
      createdByAdminId: admin.id
    });

    return ok(result);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
