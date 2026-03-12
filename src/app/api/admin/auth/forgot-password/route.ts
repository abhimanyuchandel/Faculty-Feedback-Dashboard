import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, ok, serverError, tooManyRequests } from "@/lib/http";
import { enforceSimpleRateLimit } from "@/lib/rate-limit";
import { requestAdminPasswordReset } from "@/services/admin-auth-service";

const payloadSchema = z.object({
  email: z.string().trim().email().toLowerCase()
});

function clientIp(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = enforceSimpleRateLimit(`admin-forgot-password:${ip}`, { windowMs: 60_000, max: 6 });
    if (!rate.allowed) {
      return tooManyRequests(rate.retryAfterSeconds);
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid password reset request", parsed.error.flatten());
    }

    const result = await requestAdminPasswordReset(parsed.data.email);

    return ok({
      ok: true,
      message: "If the account exists, a password reset link has been sent.",
      debugResetUrl: result.resetUrl
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
