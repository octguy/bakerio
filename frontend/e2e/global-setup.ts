import { request } from "@playwright/test";

async function globalSetup() {
  const argv = process.argv;
  const hasWeb = argv.includes("web") || argv.some((arg) => arg.includes("--project=web"));
  const hasOrder = argv.includes("order") || argv.some((arg) => arg.includes("--project=order"));
  const hasAdmin = argv.includes("admin") || argv.some((arg) => arg.includes("--project=admin"));
  const hasA11y = argv.includes("a11y") || argv.some((arg) => arg.includes("--project=a11y"));

  const needsBackend =
    hasOrder || hasAdmin || hasA11y || (!hasWeb && !hasOrder && !hasAdmin && !hasA11y);

  if (!needsBackend) {
    console.log("Only running 'web' project. Skipping Go backend health check.");
    return;
  }

  console.log("Checking Go backend availability...");
  const requestContext = await request.newContext();
  try {
    const healthRes = await requestContext.get("http://localhost:8080/health");
    if (!healthRes.ok()) {
      throw new Error(`Liveness health check returned status ${healthRes.status()}`);
    }

    const readyRes = await requestContext.get("http://localhost:8080/health/ready");
    if (!readyRes.ok()) {
      throw new Error(`Readiness check failed with status ${readyRes.status()}`);
    }

    console.log("Go backend and database are healthy and running!");

    try {
      const adminEmail = process.env.E2E_ADMIN_EMAIL || "superadmin@bakerio.com";
      const adminPassword = process.env.E2E_ADMIN_PASSWORD || "123456";

      const loginRes = await requestContext.post("http://localhost:8080/api/v1/auth/login", {
        data: { email: adminEmail, password: adminPassword },
      });
      if (!loginRes.ok()) {
        throw new Error(`Auth login failed: HTTP ${loginRes.status()}`);
      }
      const loginJson = await loginRes.json();
      const token = loginJson?.data?.access_token;
      if (!token) {
        throw new Error("Auth login response missing access_token");
      }

      const headers = { Authorization: `Bearer ${token}` };

      const branchRes = await requestContext.get("http://localhost:8080/api/v1/branch", { headers });
      if (!branchRes.ok()) {
        throw new Error(`GET /api/v1/branch returned status ${branchRes.status()}`);
      }
      const branchJson = await branchRes.json();
      if (!Array.isArray(branchJson?.data) || branchJson.data.length === 0) {
        throw new Error("Data probe failed: /api/v1/branch returned no branches");
      }

      const categoriesRes = await requestContext.get("http://localhost:8080/api/v1/categories", { headers });
      if (!categoriesRes.ok()) {
        throw new Error(`GET /api/v1/categories returned status ${categoriesRes.status()}`);
      }
      const categoriesJson = await categoriesRes.json();
      if (!Array.isArray(categoriesJson?.data) || categoriesJson.data.length === 0) {
        throw new Error("Data probe failed: /api/v1/categories returned no categories");
      }

      const productsRes = await requestContext.get("http://localhost:8080/api/v1/products", { headers });
      if (!productsRes.ok()) {
        throw new Error(`GET /api/v1/products returned status ${productsRes.status()}`);
      }
      const productsJson = await productsRes.json();
      if (!Array.isArray(productsJson?.data?.items) || productsJson.data.items.length === 0) {
        throw new Error("Data probe failed: /api/v1/products returned no products");
      }

      console.log("Go backend data layer verified (branches, categories, products).");
    } catch (probeError) {
      console.error("\n======================================================================");
      console.error("FAIL FAST: Go backend DATA layer is not serving real data");
      console.error("Please verify database seeding and that endpoints function correctly.");
      console.error("Original error:", probeError);
      console.error("======================================================================\n");
      await requestContext.dispose();
      process.exit(1);
    }
  } catch (error) {
    console.error("\n======================================================================");
    console.error("FAIL FAST: Go backend is unreachable on http://localhost:8080");
    console.error("Please start the backend server before running the E2E tests.");
    console.error("Original error:", error);
    console.error("======================================================================\n");
    process.exit(1);
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;
