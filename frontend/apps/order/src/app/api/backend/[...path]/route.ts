import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  // Token is re-injected below as a Bearer header; the backend authenticates via
  // Authorization, not cookies, so don't forward the raw cookie jar.
  "cookie",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function targetUrl(req: NextRequest, path: string[]): string {
  const incomingUrl = new URL(req.url);
  const base = API_BASE.replace(/\/+$/, "");
  const target = new URL(`${base}/${path.map(encodeURIComponent).join("/")}`);
  target.search = incomingUrl.search;
  return target.toString();
}

function forwardedHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  for (const key of HOP_BY_HOP_HEADERS) headers.delete(key);
  return headers;
}

async function proxy(req: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const requestHeaders = forwardedHeaders(req);
  // The JWT lives in an httpOnly `token` cookie (set by /api/auth). The Go
  // backend authenticates via `Authorization: Bearer`, not cookies, so inject
  // the bearer here. This keeps the token httpOnly while letting authenticated
  // client calls (profile, password, …) reach the backend.
  if (!requestHeaders.has("authorization")) {
    const token = req.cookies.get("token")?.value;
    if (token) requestHeaders.set("authorization", `Bearer ${token}`);
  }
  const res = await fetch(targetUrl(req, path), {
    method: req.method,
    headers: requestHeaders,
    body: BODYLESS_METHODS.has(req.method) ? undefined : await req.arrayBuffer(),
    cache: "no-store",
  });

  const headers = new Headers(res.headers);
  for (const key of HOP_BY_HOP_HEADERS) headers.delete(key);
  return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
