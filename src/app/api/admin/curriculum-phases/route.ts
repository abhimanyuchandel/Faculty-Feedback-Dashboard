import { forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin", "reporting"])) {
      return forbidden();
    }

    const curriculumPhases = await prisma.curriculumPhase.findMany({
      where: { activeStatus: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        sortOrder: true
      }
    });

    return ok({ curriculumPhases });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

