import { NextRequest } from "next/server";
import { forbidden, ok, serverError } from "@/lib/http";
import { runAutomatedDigestCycle } from "@/services/digest-service";

function validInternalRequest(request: NextRequest): boolean {
  const provided = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  return provided === expected;
}

export async function POST(request: NextRequest) {
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
