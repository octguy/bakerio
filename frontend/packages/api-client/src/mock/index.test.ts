import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as mockClient from "./index";

describe("Mock API client logic and localStorage persistence", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe("localStorage environment check", () => {
    it("reads default mock products and categories", async () => {
      const prods = await mockClient.getProducts();
      expect(prods.length).toBeGreaterThan(0);
      const cats = await mockClient.getCategories();
      expect(cats.length).toBeGreaterThan(0);
      const branches = await mockClient.getBranches();
      expect(branches.length).toBeGreaterThan(0);
    });

    it("saves and loads products via localStorage", async () => {
      const customProduct = {
        sku: "MOCK-CUSTOM",
        name: "Custom Product",
        unit: "piece",
        base_price: 250000,
        description: "Custom desc",
        category_id: "cat-1",
      };
      const created = await mockClient.createProduct(customProduct);
      expect(created.sku).toBe("MOCK-CUSTOM");
      expect(created.name).toBe("Custom Product");

      // Verify it is persisted in localStorage
      const savedProds = JSON.parse(localStorage.getItem("bakerio-mock-products") || "[]");
      expect(savedProds.find((p: any) => p.sku === "MOCK-CUSTOM")).toBeDefined();

      // Retrieve it
      const allProds = await mockClient.getProducts();
      expect(allProds.find((p) => p.sku === "MOCK-CUSTOM")).toBeDefined();
    });

    it("handles invalid JSON stored in products localStorage", async () => {
      localStorage.setItem("bakerio-mock-products", "{invalid-json}");
      // Should fall back to default mock products
      const prods = await mockClient.getProducts();
      expect(prods.length).toBe(mockClient.mockProducts.length);
    });

    it("saves and loads orders via localStorage", async () => {
      const order = await mockClient.createOrder(
        [{ product_id: "p-bmi-1", quantity: 2 }],
        "br-1",
        "Deliver at 5pm"
      );
      expect(order.id).toBeDefined();
      expect(order.total_amount).toBeGreaterThan(0);

      // Verify it is persisted in localStorage
      const savedOrders = JSON.parse(localStorage.getItem("bakerio-mock-orders") || "[]");
      expect(savedOrders.length).toBe(1);
      expect(savedOrders[0].id).toBe(order.id);

      // Retrieve it
      const allOrders = await mockClient.getOrders();
      expect(allOrders.length).toBe(1);
      expect(allOrders[0]?.id).toBe(order.id);
    });

    it("handles invalid JSON stored in orders localStorage", async () => {
      localStorage.setItem("bakerio-mock-orders", "{invalid-json}");
      const orders = await mockClient.getOrders();
      expect(orders).toEqual([]);
    });

    it("runs gracefully in server-side rendering mode when window/localStorage is undefined", async () => {
      (global as any).window = undefined;

      const prods = await mockClient.getProducts();
      expect(prods.length).toBe(mockClient.mockProducts.length);

      const order = await mockClient.createOrder(
        [{ product_id: "p-bmi-1", quantity: 1 }],
        "br-1"
      );
      expect(order.id).toBeDefined();
    });

    it("handles environment where window is defined but localStorage is undefined", async () => {
      const originalLocalStorage = (global as any).window.localStorage;
      Object.defineProperty(global.window, "localStorage", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const prods = await mockClient.getProducts();
      expect(prods.length).toBe(mockClient.mockProducts.length);

      Object.defineProperty(global.window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("Product operations", () => {
    it("gets products filtered by category slug", async () => {
      const prods = await mockClient.getProducts("cake");
      expect(prods.every((p) => p.category?.slug === "cake")).toBe(true);
    });

    it("gets product by ID or Slug", async () => {
      const p1 = await mockClient.getProduct("p-bmi-1");
      expect(p1).not.toBeNull();
      expect(p1!.id).toBe("p-bmi-1");

      const pVanilla = await mockClient.getProduct("banh-mi-sai-gon");
      expect(pVanilla).not.toBeNull();
      expect(pVanilla!.slug).toBe("banh-mi-sai-gon");

      const pNonexistent = await mockClient.getProduct("non-existent");
      expect(pNonexistent).toBeNull();
    });

    it("updates product details", async () => {
      const updated = await mockClient.updateProduct("p-bmi-1", {
        name: "New Bánh mì Sài Gòn",
        base_price: 200000,
      });
      expect(updated.name).toBe("New Bánh mì Sài Gòn");
      expect(updated.base_price).toBe(200000);
      expect(updated.slug).toBe("new-b-nh-m-s-i-g-n");

      // Verify update with empty/undefined partial values does not overwrite existing ones
      const updatedPartially = await mockClient.updateProduct("p-bmi-1", {
        description: "Partial desc update only",
      });
      expect(updatedPartially.name).toBe("New Bánh mì Sài Gòn");
      expect(updatedPartially.base_price).toBe(200000);
      expect(updatedPartially.description).toBe("Partial desc update only");

      // Verify update on non-existent product throws
      await expect(mockClient.updateProduct("non-existent", { name: "test" })).rejects.toThrow(
        "Product not found"
      );
    });

    it("deletes a product", async () => {
      const initialCount = (await mockClient.getProducts()).length;
      await mockClient.deleteProduct("p-bmi-1");
      const afterCount = (await mockClient.getProducts()).length;
      expect(afterCount).toBe(initialCount - 1);
    });
  });

  describe("Order operations", () => {
    it("gets order by ID", async () => {
      const order = await mockClient.createOrder([{ product_id: "p-bmi-1", quantity: 1 }], "br-1");
      const found = await mockClient.getOrder(order.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(order.id);

      const notFound = await mockClient.getOrder("order-nonexistent");
      expect(notFound).toBeNull();
    });

    it("updates order status", async () => {
      const order = await mockClient.createOrder([{ product_id: "p-bmi-1", quantity: 1 }], "br-1");
      const updated = await mockClient.updateOrderStatus(order.id, "COMPLETED");
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("COMPLETED");

      const notFound = await mockClient.updateOrderStatus("order-nonexistent", "COMPLETED");
      expect(notFound).toBeNull();
    });

    it("creates order using product not in saved list but in mockProducts fallback", async () => {
      // Set local storage products to exclude p-bmi-2
      localStorage.setItem("bakerio-mock-products", JSON.stringify([{ id: "p-bmi-1", name: "Custom Cake", base_price: 100 }]));
      
      const order = await mockClient.createOrder([{ product_id: "p-bmi-2", quantity: 3 }], "br-1");
      expect(order.items.length).toBe(1);
      expect(order.items[0]?.product_name).toBe("Bánh mì heo quay");
      expect(order.items[0]?.unit_price).toBe(72000);
    });
  });

  describe("User operations", () => {
    it("mocks login authentication", async () => {
      const res = await mockClient.login("admin@bakerio.com", "password");
      expect(res.access_token).toBeDefined();
      expect(res.user.email).toBe("admin@bakerio.com");
    });
  });
});
