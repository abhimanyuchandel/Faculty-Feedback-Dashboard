import { NextRequest, NextResponse } from "next/server";
import { resubscribeFaculty } from "@/services/digest-service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/thanks?digest=invalid", request.url));
  }

  try {
    await resubscribeFaculty(token);
    return NextResponse.redirect(new URL("/thanks?digest=resubscribed", request.url));
  } catch {
    return NextResponse.redirect(new URL("/thanks?digest=invalid", request.url));
  }
}
