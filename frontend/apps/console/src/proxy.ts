import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, locales } from "./i18n/config";

const STAFF_ROLES = new Set(["super_admin", "product_manager", "branch_manager", "branch_staff"]);

function decodeJwtPayload(token: string): { roles?: unknown; exp?: unknown } | null {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { roles?: unknown; exp?: unknown };
  } catch {
    return null;
  }
}

function hasValidStaffToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return false;
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  return roles.some((role) => typeof role === "string" && STAFF_ROLES.has(role));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("console_token")?.value;
  if (!token || !hasValidStaffToken(token)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Set locale cookie if missing
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!localeCookie || !locales.includes(localeCookie as typeof locales[number])) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, defaultLocale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
