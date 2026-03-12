import { NextRequest } from "next/server";
import { forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { importFacultyCsv } from "@/lib/csv/faculty-import";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const csvContent = await request.text();
    const result = await importFacultyCsv(csvContent);

    await recordAuditLog({
      adminUserId: admin.id,
      action: "faculty.csv_import",
      entityType: "faculty",
      metadata: {
        created: result.created,
        updated: result.updated,
        errors: result.errors.length
      }
    });

    return ok(result);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
