import { describe, expect, it } from "vitest";
import { enforceSimpleRateLimit } from "@/lib/rate-limit";

describe("enforceSimpleRateLimit", () => {
  it("allows initial requests and blocks after max", () => {
    const key = `test-key-${Date.now()}`;

    for (let i = 0; i < 3; i += 1) {
      expect(enforceSimpleRateLimit(key, { max: 3, windowMs: 10_000 }).allowed).toBe(true);
    }

    const blocked = enforceSimpleRateLimit(key, { max: 3, windowMs: 10_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
