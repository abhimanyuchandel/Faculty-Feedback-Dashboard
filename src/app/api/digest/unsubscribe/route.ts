import { NextRequest, NextResponse } from "next/server";
import { unsubscribeFaculty } from "@/services/digest-service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/thanks?digest=invalid", request.url));
  }

  try {
    await unsubscribeFaculty(token);
    return NextResponse.redirect(new URL("/thanks?digest=unsubscribed", request.url));
  } catch {
    return NextResponse.redirect(new URL("/thanks?digest=invalid", request.url));
  }
}
