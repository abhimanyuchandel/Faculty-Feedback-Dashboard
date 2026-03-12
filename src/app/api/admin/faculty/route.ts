import { NextRequest } from "next/server";
import { badRequest, created, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { facultyCreateSchema } from "@/lib/validation/schemas";
import { createFaculty, listFaculty } from "@/services/faculty-service";
import { recordAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin", "reporting"])) {
      return forbidden();
    }

    const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
    const take = Number(request.nextUrl.searchParams.get("take") ?? 100);
    const skip = Number(request.nextUrl.searchParams.get("skip") ?? 0);

    const faculty = await listFaculty({ activeOnly, take, skip });
    return ok({ faculty });
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
    const parsed = facultyCreateSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid faculty payload", parsed.error.flatten());
    }

    const createdFaculty = await createFaculty({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      primaryEmail: parsed.data.primaryEmail,
      secondaryEmail: parsed.data.secondaryEmail || null,
      activeStatus: parsed.data.activeStatus,
      digestSubscriptionStatus: parsed.data.digestSubscriptionStatus
    });

    await recordAuditLog({
      adminUserId: admin.id,
      action: "faculty.create",
      entityType: "faculty",
      entityId: createdFaculty.id,
      metadata: { primaryEmail: createdFaculty.primaryEmail }
    });

    return created({ faculty: createdFaculty });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
