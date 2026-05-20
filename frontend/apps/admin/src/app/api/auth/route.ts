import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, email, password, full_name } = body;

  try {
    if (action === "login") {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.error) return NextResponse.json({ error: json.error.message }, { status: 401 });

      // Verify user has admin/manager role
      const profileRes = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${json.data.access_token}` },
      });
      const profileJson = await profileRes.json();
      const roles: string[] = profileJson.data?.roles || [];
      if (!roles.some((r) => ["admin", "manager"].includes(r))) {
        return NextResponse.json({ error: "Access denied. Admin or Manager role required." }, { status: 403 });
      }

      const cookieStore = await cookies();
      cookieStore.set("admin_token", json.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return NextResponse.json({ success: true, user: profileJson.data });
    }

    if (action === "logout") {
      const cookieStore = await cookies();
      cookieStore.delete("admin_token");
      return NextResponse.json({ success: true });
    }

    if (action === "me") {
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_token")?.value;
      if (!token) return NextResponse.json({ user: null });

      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.error) {
        cookieStore.delete("admin_token");
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ user: json.data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
