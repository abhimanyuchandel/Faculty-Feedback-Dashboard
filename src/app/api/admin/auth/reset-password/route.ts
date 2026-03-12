import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, ok, serverError, tooManyRequests } from "@/lib/http";
import { enforceSimpleRateLimit } from "@/lib/rate-limit";
import { resetAdminPassword } from "@/services/admin-auth-service";

const payloadSchema = z.object({
  token: z.string().min(24).max(256),
  newPassword: z.string().min(10).max(128)
});

function clientIp(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = enforceSimpleRateLimit(`admin-reset-password:${ip}`, { windowMs: 60_000, max: 10 });
    if (!rate.allowed) {
      return tooManyRequests(rate.retryAfterSeconds);
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid password reset payload", parsed.error.flatten());
    }

    await resetAdminPassword(parsed.data.token, parsed.data.newPassword);

    return ok({
      ok: true,
      message: "Password reset successful. You can now sign in with your new password."
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
