import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { generateSessionQrPacket } from "@/services/qr-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin", "reporting"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const format = request.nextUrl.searchParams.get("format") === "single" ? "single" : "grid";
    const pdf = await generateSessionQrPacket(id, format);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=session-${id}-qr-${format}.pdf`
      }
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
