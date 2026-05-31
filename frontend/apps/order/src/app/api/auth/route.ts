import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { action, email, password, full_name, user_id, otp } = body;

  try {
    if (action === "login") {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.error) return NextResponse.json({ error: json.error.message }, { status: 401 });

      const cookieStore = await cookies();
      cookieStore.set("token", json.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "register") {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name }),
      });
      const json = await res.json();
      if (json.error) return NextResponse.json({ error: json.error.message }, { status: 400 });
      return NextResponse.json({ success: true, user_id: json.data?.id, email: json.data?.email });
    }

    if (action === "verify") {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, otp }),
      });
      const json = await res.json();
      if (json.error) return NextResponse.json({ error: json.error.message }, { status: 400 });
      return NextResponse.json({ success: true, verified: json.data?.verified, message: json.data?.message });
    }

    if (action === "logout") {
      const cookieStore = await cookies();
      cookieStore.delete("token");
      return NextResponse.json({ success: true });
    }

    if (action === "me") {
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;
      if (!token) return NextResponse.json({ user: null });

      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.error) {
        cookieStore.delete("token");
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ user: json.data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
