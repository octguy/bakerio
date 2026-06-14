const API = process.env.DEMO_API_URL || "http://localhost:8080/api/v1";

export async function apiToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "superadmin@bakerio.com", password: "123456" }),
  });
  const json = await res.json() as any;
  return json?.data?.access_token;
}

// Deletes every item whose `name` starts with `prefix`. resource is "branch" or "categories".
export async function cleanupByPrefix(resource: "branch" | "categories" | "products" | "vouchers", prefix: string): Promise<void> {
  const token = await apiToken();
  if (!token) return;
  const listRes = await fetch(`${API}/${resource}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!listRes.ok) return;
  const body = await listRes.json() as any;
  const items = Array.isArray(body?.data) ? body.data : (body?.data?.items ?? []);
  for (const it of items) {
    if (it && typeof it.name === "string" && it.name.startsWith(prefix)) {
      await fetch(`${API}/${resource}/${it.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  }
}
