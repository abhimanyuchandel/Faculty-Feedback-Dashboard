import { addDays, addMonths, isAfter } from "date-fns";
import { createHash } from "crypto";

const DIGEST_INTERVAL_MONTHS = 6;
const DIGEST_OFFSET_MIN_DAYS = 1;
const DIGEST_OFFSET_MAX_DAYS = 60;

export type DigestWindow = {
  offsetDays: number;
  cycleDueAt: Date;
  windowStart: Date;
  windowEnd: Date;
};

export const DIGEST_WINDOW_MONTHS = DIGEST_INTERVAL_MONTHS;

export function digestOffsetDays(seed: string): number {
  const hash = createHash("sha256").update(seed).digest();
  const bucket = hash.readUInt32BE(0) % DIGEST_OFFSET_MAX_DAYS;
  return DIGEST_OFFSET_MIN_DAYS + bucket;
}

export function firstDigestDueAt(createdAt: Date, seed: string): Date {
  return addDays(addMonths(createdAt, DIGEST_INTERVAL_MONTHS), digestOffsetDays(seed));
}

export function latestScheduledDigestWindow(createdAt: Date, seed: string, asOf = new Date()): DigestWindow | null {
  const offsetDays = digestOffsetDays(seed);
  const firstDueAt = addDays(addMonths(createdAt, DIGEST_INTERVAL_MONTHS), offsetDays);

  if (isAfter(firstDueAt, asOf)) {
    return null;
  }

  let cycleDueAt = firstDueAt;
  let nextDueAt = addMonths(cycleDueAt, DIGEST_INTERVAL_MONTHS);

  while (!isAfter(nextDueAt, asOf)) {
    cycleDueAt = nextDueAt;
    nextDueAt = addMonths(cycleDueAt, DIGEST_INTERVAL_MONTHS);
  }

  return {
    offsetDays,
    cycleDueAt,
    windowStart: addMonths(cycleDueAt, -DIGEST_INTERVAL_MONTHS),
    windowEnd: cycleDueAt
  };
}

export function rollingDigestWindow(asOf = new Date()): DigestWindow {
  return {
    offsetDays: 0,
    cycleDueAt: asOf,
    windowStart: addMonths(asOf, -DIGEST_INTERVAL_MONTHS),
    windowEnd: asOf
  };
}
