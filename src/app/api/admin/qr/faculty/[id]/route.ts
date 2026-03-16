import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { generateFacultyQrPngBuffer } from "@/services/qr-service";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const faculty = await prisma.faculty.findUnique({ where: { id } });

    if (!faculty) {
      return notFound("Faculty not found");
    }

    const png = await generateFacultyQrPngBuffer(faculty.publicToken, request.nextUrl.origin);
    const body = png.slice().buffer as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename=${faculty.lastName}-${faculty.firstName}-qr.png`
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
