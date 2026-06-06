import { NextResponse } from "next/server";

// Identifies which app is actually serving this container. The deploy workflow
// asserts on `app` to detect image/port mix-ups (e.g. order ↔ admin swaps).
export function GET() {
  return NextResponse.json({ status: "ok", app: "admin" });
}
