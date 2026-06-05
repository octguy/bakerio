import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
export const STAFF_ROLES = new Set(["super_admin", "product_manager", "branch_manager", "branch_staff"]);

export function getTokenRoles(token: string): string[] {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { roles?: unknown };
  return Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === "string")
    : [];
}

export function hasStaffAccess(roles: string[]): boolean {
  return roles.some((role) => STAFF_ROLES.has(role));
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { action, email, password } = body;

  try {
    if (action === "login") {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (json.error) return NextResponse.json({ error: json.error.message }, { status: 401 });

      const token = json.data.access_token;

      // Backend role IDs come from JWT claims; only staff roles may enter the admin app.
      const roles = getTokenRoles(token);
      if (!hasStaffAccess(roles)) {
        return NextResponse.json({ error: "Access denied. Staff role required." }, { status: 403 });
      }

      // Fetch profile for user display info
      const profileRes = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const profileText = await profileRes.text();
      const profileJson = JSON.parse(profileText);
      const user = profileJson.data ? { ...profileJson.data, roles } : { email, roles };

      const cookieStore = await cookies();
      cookieStore.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return NextResponse.json({ success: true, user, token });
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

      const roles = getTokenRoles(token);
      if (!hasStaffAccess(roles)) {
        cookieStore.delete("admin_token");
        return NextResponse.json({ user: null });
      }

      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (json.error) {
        cookieStore.delete("admin_token");
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ user: { ...json.data, roles }, token });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("[admin/api/auth] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
