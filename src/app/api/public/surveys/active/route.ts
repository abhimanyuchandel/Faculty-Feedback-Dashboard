import { notFound, ok, serverError } from "@/lib/http";
import { getActiveSurveyVersion } from "@/services/survey-service";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [surveyVersion, phases] = await Promise.all([
      getActiveSurveyVersion(),
      prisma.curriculumPhase.findMany({
        where: { activeStatus: true },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    if (!surveyVersion) {
      return notFound("No active survey version");
    }

    return ok({
      surveyVersion,
      curriculumPhases: phases
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
