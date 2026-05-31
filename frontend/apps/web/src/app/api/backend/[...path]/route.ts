import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
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
  const res = await fetch(targetUrl(req, path), {
    method: req.method,
    headers: forwardedHeaders(req),
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
