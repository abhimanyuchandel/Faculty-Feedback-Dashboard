import { NextRequest } from "next/server";
import { forbidden, ok, serverError } from "@/lib/http";
import { runAutomatedDigestCycle } from "@/services/digest-service";

function validInternalRequest(request: NextRequest): boolean {
  const provided = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  return provided === expected || bearerToken === expected;
}

async function handleDigestRun(request: NextRequest) {
  try {
    if (!validInternalRequest(request)) {
      return forbidden("Invalid cron secret");
    }

    const result = await runAutomatedDigestCycle();
    return ok(result);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function GET(request: NextRequest) {
  return handleDigestRun(request);
}

export async function POST(request: NextRequest) {
  return handleDigestRun(request);
}
