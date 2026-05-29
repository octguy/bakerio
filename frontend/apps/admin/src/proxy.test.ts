import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function token(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encodedPayload}.signature`;
}

function request(path: string, adminToken?: string) {
  const headers = new Headers();
  if (adminToken) headers.set("cookie", `admin_token=${adminToken}`);
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("admin proxy", () => {
  it("redirects dashboard requests without an admin token", () => {
    const res = proxy(request("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?next=%2F");
  });

  it("redirects dashboard requests with a non-staff token", () => {
    const res = proxy(request("/orders", token({ roles: ["customer"], exp: 4_102_444_800 })));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?next=%2Forders");
  });

  it("redirects dashboard requests with an expired staff token", () => {
    const res = proxy(request("/products", token({ roles: ["product_manager"], exp: 1 })));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?next=%2Fproducts");
  });

  it("allows dashboard requests with a valid staff token", () => {
    const res = proxy(request("/users", token({ roles: ["branch_manager"], exp: 4_102_444_800 })));
    expect(res.status).toBe(200);
  });

  it("allows the login page", () => {
    const res = proxy(request("/login"));
    expect(res.status).toBe(200);
  });
});
