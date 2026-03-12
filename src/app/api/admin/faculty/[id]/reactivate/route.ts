import { NextRequest } from "next/server";
import { forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { reactivateFaculty } from "@/services/faculty-service";
import { recordAuditLog } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }
    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const faculty = await reactivateFaculty(id);

    await recordAuditLog({
      adminUserId: admin.id,
      action: "faculty.reactivate",
      entityType: "faculty",
      entityId: id
    });

    return ok({ faculty });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
