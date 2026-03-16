import { NextResponse } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { listFaculty } from "@/services/faculty-service";

function escapeCsv(value: string | null | undefined): string {
  const text = value ?? "";
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET() {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const faculty = await listFaculty({ take: 10_000, skip: 0 });

    const header = [
      "first_name",
      "last_name",
      "primary_email",
      "secondary_email",
      "department",
      "active_status",
      "digest_subscription_status",
      "public_token"
    ];

    const rows = faculty.map((member) => [
      member.firstName,
      member.lastName,
      member.primaryEmail,
      member.secondaryEmail ?? "",
      member.department,
      String(member.activeStatus),
      member.digestSubscriptionStatus,
      member.publicToken
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((column) => escapeCsv(column)).join(","))
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=faculty-export.csv"
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
