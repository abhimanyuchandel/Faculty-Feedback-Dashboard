import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized, created } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { createDraftSurveyVersion, getSurveyVersionById } from "@/services/survey-service";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin", "reporting"])) {
      return forbidden();
    }

    const versionId = request.nextUrl.searchParams.get("versionId");
    if (versionId) {
      const version = await getSurveyVersionById(versionId);
      return ok({ version });
    }

    const versions = await prisma.surveyVersion.findMany({
      orderBy: { versionNumber: "desc" },
      include: {
        _count: { select: { questions: true, feedbackSubmissions: true } }
      }
    });

    return ok({ versions });
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
    if (!body.label || typeof body.label !== "string") {
      return badRequest("label is required");
    }

    const version = await createDraftSurveyVersion(body.label, admin.id);

    return created({ version });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
