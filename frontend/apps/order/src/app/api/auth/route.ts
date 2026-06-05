import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

type BackendResponse = {
  error?: { message?: string };
  data?: {
    access_token?: string;
    id?: string;
    email?: string;
    verified?: boolean;
    message?: string;
  };
};

// Read the body as text first, then JSON.parse inside try/catch. Backend cold
// starts / 502s / empty bodies / HTML error pages would otherwise make
// res.json() throw and surface as an opaque 500.
async function safeJson(res: Response): Promise<BackendResponse | null> {
  try {
    const text = await res.text();
    return text ? (JSON.parse(text) as BackendResponse) : null;
  } catch {
    return null;
  }
}

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
      const json = await safeJson(res);
      if (json?.error) return NextResponse.json({ error: json.error.message }, { status: 401 });

      const accessToken = json?.data?.access_token;
      if (!res.ok || typeof accessToken !== "string") {
        return NextResponse.json({ error: "Login failed" }, { status: res.ok ? 502 : res.status });
      }

      const cookieStore = await cookies();
      cookieStore.set("token", accessToken, {
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
      const json = await safeJson(res);
      if (json?.error) return NextResponse.json({ error: json.error.message }, { status: 400 });
      if (!res.ok || !json) {
        return NextResponse.json({ error: "Registration failed" }, { status: res.ok ? 502 : res.status });
      }
      return NextResponse.json({ success: true, user_id: json.data?.id, email: json.data?.email });
    }

    if (action === "verify") {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, otp }),
      });
      const json = await safeJson(res);
      if (json?.error) return NextResponse.json({ error: json.error.message }, { status: 400 });
      if (!res.ok || !json) {
        return NextResponse.json({ error: "Verification failed" }, { status: res.ok ? 502 : res.status });
      }
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

      // `me` runs on every page load (CartSync/useAuth). A transient backend
      // issue must never 500 the whole app, so a network failure here logs the
      // user out gracefully for this request without clearing their token.
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("/api/auth me fetch failed:", err);
        return NextResponse.json({ user: null });
      }

      const json = await safeJson(res);
      if (json?.error) {
        cookieStore.delete("token");
        return NextResponse.json({ user: null });
      }
      if (!res.ok || !json) {
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ user: json.data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("/api/auth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
