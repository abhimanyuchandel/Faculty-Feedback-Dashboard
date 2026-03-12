import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: "bad_request", message, details },
    { status: 400 }
  );
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: "unauthorized", message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: "forbidden", message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: "not_found", message }, { status: 404 });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "rate_limited", message: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": retryAfterSeconds.toString() }
    }
  );
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: "server_error", message }, { status: 500 });
}
