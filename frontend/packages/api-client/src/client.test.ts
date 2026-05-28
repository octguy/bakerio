import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as client from "./client";
import { mockProducts, mockCategories } from "./mock";

const originalFetch = global.fetch;

describe("API Client tests", () => {
  let fetchMock: any;

  beforeEach(async () => {
    fetchMock = vi.fn().mockImplementation(() => 
      Promise.resolve({
        status: 200,
        ok: true,
        text: () => Promise.resolve('{"data": {}}'),
        json: () => Promise.resolve({ data: {} }),
      })
    );
    global.fetch = fetchMock;
    localStorage.clear();
    await client.logout(); // Reset token
    fetchMock.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  const mockResponse = (status: number, data: any, ok = true) => {
    const textPromise = Promise.resolve(typeof data === "string" ? data : JSON.stringify(data));
    fetchMock.mockResolvedValue({
      status,
      ok,
      text: () => textPromise,
      json: () => textPromise.then((text) => JSON.parse(text)),
    });
  };

  describe("Request helper edge cases", () => {
    const requestProbe = () => client.login("test@bakerio.com", "password");

    it("handles 204 No Content response", async () => {
      mockResponse(204, "", true);
      const res = await client.getBranches();
      expect(res).toBeNull();
    });

    it("handles non-ok response with plain text error", async () => {
      mockResponse(500, "Database Error", false);
      await expect(requestProbe()).rejects.toThrow("Database Error");
    });

    it("handles non-ok response with no text/body gracefully", async () => {
      mockResponse(500, "", false);
      await expect(requestProbe()).rejects.toThrow("HTTP error 500 from /auth/login");
    });

    it("handles non-ok response with json error message", async () => {
      mockResponse(400, { error: { message: "Bad Payload" } }, false);
      await expect(requestProbe()).rejects.toThrow("Bad Payload");
    });

    it("handles non-ok response with alternate message field", async () => {
      mockResponse(403, { message: "Forbidden Access" }, false);
      await expect(requestProbe()).rejects.toThrow("Forbidden Access");
    });

    it("handles empty non-204 responses gracefully", async () => {
      mockResponse(200, "", true);
      const res = await client.getBranches();
      expect(res).toBeNull();
    });

    it("handles response with invalid JSON content", async () => {
      mockResponse(200, "{invalid-json}", true);
      await expect(requestProbe()).rejects.toThrow("Invalid JSON from");
    });

    it("handles standard JSON response containing api-level error field", async () => {
      mockResponse(200, { error: { message: "Internal logic failed" } }, true);
      await expect(requestProbe()).rejects.toThrow("Internal logic failed");
    });
  });

  describe("Auth operations", () => {
    it("sets token after successful login", async () => {
      mockResponse(200, { data: { access_token: "my-jwt-token" } });
      const res = await client.login("test@bakerio.com", "password");
      expect(res.access_token).toBe("my-jwt-token");
      expect(client.getToken()).toBe("my-jwt-token");
    });

    it("registers new user successfully", async () => {
      mockResponse(201, { data: { id: "123", email: "test@bakerio.com" } });
      const res = await client.register("test@bakerio.com", "pass123", "Test User");
      expect(res.id).toBe("123");
      expect(res.email).toBe("test@bakerio.com");
    });

    it("clears token on logout", async () => {
      client.setToken("some-token");
      mockResponse(200, { data: null });
      await client.logout();
      expect(client.getToken()).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("Products real/fallback operations", () => {
    it("fetches products from backend", async () => {
      const mockProdList = [{ id: "p-test", name: "Test Product", base_price: 100 }];
      mockResponse(200, { data: mockProdList });
      const res = await client.getProducts();
      expect(res).toEqual(mockProdList);
    });

    it("falls back to mock products when getProducts backend fails", async () => {
      fetchMock.mockRejectedValue(new Error("Network disconnect"));
      const res = await client.getProducts();
      expect(res.length).toBeGreaterThan(0);
      expect(res[0]?.id).toBe(mockProducts[0]?.id);
    });

    it("tracks mock product fallback without console noise in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      fetchMock.mockRejectedValue(new Error("Network disconnect"));

      await client.getProducts();

      expect(client.getApiHealth().mockServed).toContain("products.list");
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("fetches single product from backend", async () => {
      const mockProd = { id: "p-1", name: "Vanilla Sponge Cake" };
      mockResponse(200, { data: mockProd });
      const res = await client.getProduct("p-1");
      expect(res).toEqual(mockProd);
    });

    it("falls back to mock product when getProduct backend fails and item is in mock database", async () => {
      fetchMock.mockRejectedValue(new Error("Backend not found"));
      const res = await client.getProduct("p-bmi-1");
      expect(res.id).toBe("p-bmi-1");
    });

    it("throws if getProduct backend fails and item is not in mock database", async () => {
      fetchMock.mockRejectedValue(new Error("Database offline"));
      await expect(client.getProduct("non-existent")).rejects.toThrow("Database offline");
    });

    it("creates product on backend", async () => {
      const input = {
        sku: "SKU1",
        slug: "new-prod",
        name: "New Prod",
        unit: "piece",
        base_price: 100,
      };
      const output = { id: "p-new", ...input, base_price: 100, is_active: true, created_at: "" };
      mockResponse(201, { data: output });
      const res = await client.createProduct(input);
      expect(res.id).toBe("p-new");
      const [, requestInit] = fetchMock.mock.calls[0];
      expect(JSON.parse(requestInit.body)).toEqual(
        expect.objectContaining({ slug: input.slug }),
      );
    });

    it("falls back to mock product creation when backend fails", async () => {
      fetchMock.mockRejectedValue(new Error("Creation forbidden"));
      const input = {
        sku: "SKU-MOCK",
        slug: "mock-prod-name",
        name: "Mock Prod Name",
        unit: "piece",
        base_price: 50,
      };
      const res = await client.createProduct(input);
      expect(res.sku).toBe("SKU-MOCK");
      expect(res.name).toBe("Mock Prod Name");
    });

    it("updates product on backend", async () => {
      const updateData = {
        name: "Updated Name",
        base_price: 150,
        category_id: "cat-1",
        slug: "updated-name",
      };
      mockResponse(200, { data: { id: "p-1", ...updateData } });
      const res = await client.updateProduct("p-1", updateData);
      expect(res.name).toBe("Updated Name");
      const [, requestInit] = fetchMock.mock.calls[0];
      expect(JSON.parse(requestInit.body)).toEqual(
        expect.objectContaining({ category_id: "cat-1" }),
      );
    });

    it("falls back to mock product update when backend fails", async () => {
      fetchMock.mockRejectedValue(new Error("Update failed"));
      const res = await client.updateProduct("p-bmi-1", { name: "Updated Via Mock", base_price: 180000 });
      expect(res.name).toBe("Updated Via Mock");
      expect(res.base_price).toBe(180000);
    });

    it("deletes product on backend", async () => {
      mockResponse(200, { data: null });
      await client.deleteProduct("p-1");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/products/p-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("falls back to mock product deletion when backend fails", async () => {
      fetchMock.mockRejectedValue(new Error("Deletion failed"));
      const beforeProds = await client.getProducts();
      const initialCount = beforeProds.length;
      const targetId = beforeProds[0]?.id;
      expect(targetId).toBeDefined();

      await client.deleteProduct(targetId!);

      const afterProds = await client.getProducts();
      expect(afterProds.length).toBe(initialCount - 1);
      expect(afterProds.find((p) => p.id === targetId)).toBeUndefined();
    });
  });

  describe("Categories real/fallback operations", () => {
    it("fetches categories from backend", async () => {
      const mockCats = [{ id: "cat-1", name: "Cakes", slug: "cakes", sort_order: 1, is_active: true }];
      mockResponse(200, { data: mockCats });
      const res = await client.getCategories();
      expect(res).toEqual(mockCats);
    });

    it("falls back to mock categories if backend return is empty list", async () => {
      mockResponse(200, { data: [] });
      const res = await client.getCategories();
      expect(res).toEqual(mockCategories);
      expect(client.getApiHealth().mockServed).toContain("categories.empty");
    });

    it("falls back to mock categories if backend fails", async () => {
      fetchMock.mockRejectedValue(new Error("Backend offline"));
      const res = await client.getCategories();
      expect(res).toEqual(mockCategories);
      expect(client.getApiHealth().mockServed).toContain("categories.list");
    });

    it("fetches single category from backend", async () => {
      const mockCat = { id: "cat-1", name: "Cakes" };
      mockResponse(200, { data: mockCat });
      const res = await client.getCategory("cat-1");
      expect(res).toEqual(mockCat);
    });

    it("falls back to mock category list if single category request fails", async () => {
      fetchMock.mockRejectedValue(new Error("Category fetch failed"));
      const res = await client.getCategory("cat-banhmi");
      expect(res.id).toBe("cat-banhmi");
      expect(res.slug).toBe("banh-mi");
    });

    it("throws if single category request fails and category slug is not in mock", async () => {
      fetchMock.mockRejectedValue(new Error("Category fetch failed"));
      await expect(client.getCategory("cat-nonexistent")).rejects.toThrow("Category fetch failed");
    });

    it("creates, updates, and deletes categories successfully", async () => {
      mockResponse(201, { data: { id: "cat-new", name: "Drink" } });
      let res = await client.createCategory({ name: "Drink" });
      expect(res.id).toBe("cat-new");

      mockResponse(200, { data: { id: "cat-new", name: "Drinks updated" } });
      res = await client.updateCategory("cat-new", { name: "Drinks updated" });
      expect(res.name).toBe("Drinks updated");

      mockResponse(200, { data: null });
      await client.deleteCategory("cat-new");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/categories/cat-new"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("falls back to mock category deletion when backend fails", async () => {
      fetchMock.mockRejectedValue(new Error("Deletion failed"));
      const beforeCats = await client.getCategories();
      const initialCount = beforeCats.length;
      const targetId = beforeCats[0]?.id;
      expect(targetId).toBeDefined();

      await client.deleteCategory(targetId!);

      const afterCats = await client.getCategories();
      expect(afterCats.length).toBe(initialCount - 1);
      expect(afterCats.find((c) => c.id === targetId)).toBeUndefined();
    });
  });

  describe("Branch operations", () => {
    it("gets all branches and single branch", async () => {
      const branches = [{ id: "br-1", name: "Saigon" }];
      mockResponse(200, { data: branches });
      let res = await client.getBranches();
      expect(res).toEqual(branches);

      mockResponse(200, { data: branches[0] });
      const single = await client.getBranch("br-1");
      expect(single).toEqual(branches[0]);
    });

    it("creates, updates, and deletes branches", async () => {
      const payload = { name: "Hanoi", address: "123 St", region: "north" };
      mockResponse(201, { data: { id: "br-2", ...payload } });
      let res = await client.createBranch(payload);
      expect(res.id).toBe("br-2");

      mockResponse(200, { data: { id: "br-2", ...payload, name: "Hanoi updated" } });
      res = await client.updateBranch("br-2", { name: "Hanoi updated" });
      expect(res.name).toBe("Hanoi updated");

      mockResponse(200, { data: null });
      await client.deleteBranch("br-2");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/branch/br-2"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Supplier operations", () => {
    it("serves suppliers from the explicit mock module and tracks that honestly", async () => {
      const res = await client.getSuppliers("Long An");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(res).toEqual([
        expect.objectContaining({ id: "sup-3", name: "Long An Farm", region: "Long An" }),
        expect.objectContaining({ id: "sup-4", name: "Trần family", region: "Long An" }),
      ]);
      expect(res.every((supplier) => supplier.region === "Long An")).toBe(true);
      expect(client.getApiHealth().mockServed).toContain("suppliers.list");

      const created = await client.createSupplier({ name: "Sugar Inc", region: "south" });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(created).toEqual(expect.objectContaining({ name: "Sugar Inc", region: "south" }));
      expect(client.getApiHealth().mockServed).toContain("suppliers.create");
    });
  });

  describe("Procurement operations", () => {
    it("handles procurement operations", async () => {
      let res = await client.getProcurementOrders();
      expect(res).toEqual([]);

      const created = await client.createProcurementOrder({ supplier_id: "sup-1", items: [] });
      expect(created.id).toBe("po-1001");

      res = await client.getProcurementOrders();
      expect(res[0]?.id).toBe("po-1001");

      const updated = await client.updateProcurementStatus("po-1001", "DELIVERED");
      expect(updated!.status).toBe("DELIVERED");
    });
  });

  describe("User operations", () => {
    it("creates user, gets profile, and updates profile", async () => {
      mockResponse(201, { data: { id: "u-1", email: "user@bakerio.com" } });
      let res = await client.createUser({ email: "user@bakerio.com", full_name: "User One", password: "pwd", role: "staff" });
      expect(res.id).toBe("u-1");

      mockResponse(200, { data: { id: "u-1", display_name: "User One" } });
      res = await client.getUserProfile("u-1");
      expect(res.display_name).toBe("User One");

      mockResponse(200, { data: { id: "current-user", display_name: "Me" } });
      res = await client.getMyProfile();
      expect(res.display_name).toBe("Me");

      mockResponse(200, { data: { id: "current-user", display_name: "Me New" } });
      res = await client.updateMyProfile({ display_name: "Me New" });
      expect(res.display_name).toBe("Me New");
    });
  });

  describe("Mock functions passing", () => {
    it("routes order helpers to the mock order store with observable behavior", async () => {
      const orderProduct = mockProducts.find((product) => product.id === "p-bmi-1");
      expect(orderProduct).toBeDefined();
      const expectedLineTotal = orderProduct!.base_price * 2;
      const order = await client.createOrder({
        branch_id: "br-le-loi",
        items: [{ product_id: orderProduct!.id, quantity: 2 }],
        fulfillment_mode: "PICKUP",
        requested_time: "ASAP",
        payment_method: "COD",
        delivery_fee_amount: 0,
        loyalty_discount_amount: 0,
        subtotal_amount: expectedLineTotal,
        total_amount: expectedLineTotal,
      });

      expect(order).toMatchObject({
        branch_id: "br-le-loi",
        status: "PENDING_PAYMENT",
        subtotal_amount: expectedLineTotal,
        total_amount: expectedLineTotal,
      });
      expect(order.items).toEqual([
        expect.objectContaining({
          product_id: orderProduct!.id,
          product_name: orderProduct!.name,
          quantity: 2,
          total_price: expectedLineTotal,
        }),
      ]);

      await expect(client.getOrder(order.id)).resolves.toMatchObject({ id: order.id });
      await expect(client.getOrders()).resolves.toEqual([expect.objectContaining({ id: order.id })]);
      await expect(client.updateOrderStatus(order.id, "READY")).resolves.toMatchObject({
        id: order.id,
        status: "READY",
      });
      await expect(client.reorderItems(order.id)).resolves.toEqual([{ product_id: orderProduct!.id, quantity: 2 }]);
    });
  });

  describe("Index entrypoint exports", () => {
    it("verifies all index re-exports are accessible", async () => {
      const indexEntrypoint = await import("./index.js");
      expect(indexEntrypoint.getProducts).toBeDefined();
      expect(indexEntrypoint.mockProducts).toBeDefined();
      expect(indexEntrypoint.VERSION).toBe("1.0.0");
    });
  });
});
