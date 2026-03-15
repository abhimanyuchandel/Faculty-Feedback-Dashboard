import { env } from "@/lib/env";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function parseCandidate(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.toLowerCase();
    const looksLikePlaceholder =
      hostname.includes("your-project-name") ||
      trimmed.includes("<") ||
      trimmed.includes(">");
    const isLocalOnly = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";

    if (process.env.NODE_ENV === "production" && (looksLikePlaceholder || isLocalOnly)) {
      return null;
    }

    return stripTrailingSlash(parsed.toString());
  } catch {
    return null;
  }
}

export function appBaseUrl() {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL
  ];

  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return stripTrailingSlash(env.APP_BASE_URL);
}

export function appUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appBaseUrl()}${normalizedPath}`;
}
