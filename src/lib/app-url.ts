import { env } from "@/lib/env";

type ParsedCandidate = {
  hostname: string;
  url: string;
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function parseCandidate(raw: string | undefined): ParsedCandidate | null {
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

    return {
      hostname,
      url: stripTrailingSlash(parsed.toString())
    };
  } catch {
    return null;
  }
}

export function appBaseUrl() {
  const productionUrl = parseCandidate(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (process.env.NODE_ENV === "production" && productionUrl && !productionUrl.hostname.endsWith(".vercel.app")) {
    return productionUrl.url;
  }

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
      return parsed.url;
    }
  }

  return stripTrailingSlash(env.APP_BASE_URL);
}

export function appUrl(path: string, baseUrl?: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const resolvedBaseUrl = baseUrl ? stripTrailingSlash(baseUrl) : appBaseUrl();
  return `${resolvedBaseUrl}${normalizedPath}`;
}
