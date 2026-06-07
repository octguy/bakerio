import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, locales } from "./i18n/config";

export function proxy(request: NextRequest) {
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
