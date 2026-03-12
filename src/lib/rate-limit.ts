type Bucket = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, Bucket>();

export function enforceSimpleRateLimit(
  key: string,
  options?: { windowMs?: number; max?: number }
): { allowed: boolean; retryAfterSeconds: number } {
  const windowMs = options?.windowMs ?? 60_000;
  const max = options?.max ?? 30;

  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000)
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return { allowed: true, retryAfterSeconds: 0 };
}
