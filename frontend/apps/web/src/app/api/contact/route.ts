import { NextRequest, NextResponse } from "next/server";

const CONTACT_ENDPOINT = process.env.CONTACT_ENDPOINT || process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || "";
const UNCONFIGURED_MESSAGE = "Contact form is not configured yet. Please email hello@bakerio.vn directly.";

export async function POST(req: NextRequest) {
  if (!CONTACT_ENDPOINT.trim()) {
    return NextResponse.json({ error: { message: UNCONFIGURED_MESSAGE } }, { status: 501 });
  }

  const body = await req.text();
  const upstream = await fetch(CONTACT_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": req.headers.get("content-type") || "application/json",
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") || "application/json";
  return new NextResponse(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { "Content-Type": contentType },
  });
}
