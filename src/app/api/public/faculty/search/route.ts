import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/lib/http";
import { searchFacultyPublic } from "@/services/faculty-service";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return badRequest("Query parameter q is required");
    }

    const rows = await searchFacultyPublic(q, 25);

    return ok({
      results: rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        primaryEmail: row.primary_email,
        secondaryEmail: row.secondary_email,
        publicToken: row.public_token
      }))
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
