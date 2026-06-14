import type { APIRequestContext } from "@playwright/test";

// Fetch all items of a given resource using Playwright request context.
// Uses DEMO_API_URL env var or fallback to localhost.
export async function fetchAll(resource: string, request: APIRequestContext): Promise<any[]> {
  const base = process.env.DEMO_API_URL || `http://localhost:8080/api/v1`;
  const url = `${base}/${resource}`;
  const tokenRes = await request.post(`${base}/auth/login`, {
    data: {
      email: process.env.E2E_ADMIN_EMAIL || "superadmin@bakerio.com",
      password: process.env.E2E_ADMIN_PASSWORD || "123456",
    },
  });
  const tokenJson = await tokenRes.json();
  const token = tokenJson?.data?.access_token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await request.get(url, { headers } as any);
  if (!res.ok()) {
    throw new Error(`fetchAll ${resource} failed with ${res.status()}`);
  }
  const json = await res.json();
  // API may return { data: [...] } or { data: { items: [...] } }
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  return [];
}
