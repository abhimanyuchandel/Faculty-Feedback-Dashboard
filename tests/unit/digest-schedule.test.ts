import { describe, expect, it } from "vitest";
import {
  digestOffsetDays,
  firstDigestDueAt,
  latestScheduledDigestWindow,
  rollingDigestWindow
} from "@/lib/digest-schedule";

describe("digest scheduling", () => {
  it("generates a stable offset between 1 and 60 days", () => {
    const first = digestOffsetDays("faculty-a");
    const second = digestOffsetDays("faculty-a");

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThanOrEqual(60);
  });

  it("starts six months after faculty creation plus offset", () => {
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    const dueAt = firstDigestDueAt(createdAt, "faculty-a");

    expect(dueAt.getUTCFullYear()).toBe(2025);
    expect(dueAt.getUTCMonth()).toBeGreaterThanOrEqual(6);
  });

  it("returns the latest due six-month window", () => {
    const createdAt = new Date("2024-01-10T00:00:00.000Z");
    const window = latestScheduledDigestWindow(createdAt, "faculty-b", new Date("2025-09-20T00:00:00.000Z"));

    expect(window).not.toBeNull();
    expect(window?.windowStart).toBeInstanceOf(Date);
    expect(window?.windowEnd).toBeInstanceOf(Date);
    expect(window?.cycleDueAt.getTime()).toBe(window?.windowEnd.getTime());
  });

  it("returns a rolling six-month manual window", () => {
    const asOf = new Date("2026-03-16T12:00:00.000Z");
    const window = rollingDigestWindow(asOf);

    expect(window.windowEnd.toISOString()).toBe(asOf.toISOString());
    expect(window.windowStart.getTime()).toBeLessThan(window.windowEnd.getTime());
  });
});
