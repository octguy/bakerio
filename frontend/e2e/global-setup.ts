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
