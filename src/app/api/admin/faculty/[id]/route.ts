import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { updateFaculty } from "@/services/faculty-service";
import { recordAuditLog } from "@/lib/audit";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const body = await request.json();

    const updated = await updateFaculty(id, {
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      primaryEmail: typeof body.primaryEmail === "string" ? body.primaryEmail : undefined,
      secondaryEmail: body.secondaryEmail,
      activeStatus: typeof body.activeStatus === "boolean" ? body.activeStatus : undefined,
      digestSubscriptionStatus: body.digestSubscriptionStatus
    });

    await recordAuditLog({
      adminUserId: admin.id,
      action: "faculty.update",
      entityType: "faculty",
      entityId: id
    });

    return ok({ faculty: updated });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return notFound("Faculty not found");
    }
    return badRequest("Unable to update faculty");
  }
}
