import { request } from "@playwright/test";

async function globalSetup() {
  // Determine API base URL
  const apiBase =
    process.env.DEMO_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080/api/v1";

  // Verify admin credentials are provided
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (!adminEmail) {
    throw new Error("E2E_ADMIN_EMAIL environment variable is required for deployed setup");
  }
  if (!adminPassword) {
    throw new Error("E2E_ADMIN_PASSWORD environment variable is required for deployed setup");
  }

  const requestContext = await request.newContext();

  try {
    // Login as admin to obtain token
    const loginRes = await requestContext.post(`${apiBase}/auth/login`, {
      data: { email: adminEmail, password: adminPassword },
    });
    if (!loginRes.ok()) {
      throw new Error(`Admin login failed: HTTP ${loginRes.status()}`);
    }
    const loginJson = await loginRes.json();
    const token = loginJson?.data?.access_token ?? loginJson?.access_token;
    if (!token) {
      throw new Error("Admin login response missing access_token");
    }
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Optionally seed demo data (guard‑skipped if already seeded)
    try {
      const seedRes = await requestContext.post(`${apiBase}/admin/seed-demo`, {
        headers: authHeaders,
      });
      if (!seedRes.ok()) {
        console.warn(`seed-demo returned non‑2xx status ${seedRes.status()}, continuing...`);
      }
    } catch (e) {
      console.warn(`seed-demo request failed: ${e}, continuing...`);
    }

    // Verify essential data exists (non‑empty)
    const probes = [
      { path: "/branch", name: "branches" },
      { path: "/categories", name: "categories" },
      { path: "/products", name: "products" },
    ];
    for (const p of probes) {
      const res = await requestContext.get(`${apiBase}${p.path}`, { headers: authHeaders });
      if (!res.ok()) {
        throw new Error(`GET ${p.path} failed: HTTP ${res.status()}`);
      }
      const json = await res.json();
      // Normalise possible payload shapes
      const dataArray = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : [];
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error(`Data probe failed: ${p.path} returned empty data`);
      }
    }
    console.log("Deployed API health check passed.");
  } catch (error) {
    console.error("\n===== E2E DEFINED SETUP FAILURE =====\n", error);
    await requestContext.dispose();
    process.exit(1);
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;
