import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as client from "./client";
import { mockProducts } from "./mock";

const originalFetch = global.fetch;

describe("API Client DTO Adapters and Mock Fallback tests", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        text: () => Promise.resolve('{"data": {}}'),
        json: () => Promise.resolve({ data: {} }),
      })
    );
    global.fetch = fetchMock;
    client.logout(); // Reset token
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

  describe("adaptProduct price->base_price and getProducts envelope extraction", () => {
    it("normalizes product price strings and extracts products from envelopes", async () => {
      const backendResponse = {
        data: {
          items: [
            {
              id: "p-1",
              name: "Product with Price String",
              sku: "SKU1",
              price: "150.00",
              unit: "pcs",
            },
            {
              id: "p-2",
              name: "Product in Frontend Shape",
              sku: "SKU2",
              base_price: 200,
              unit: "pcs",
            },
          ],
          total: 2,
          page: 1,
          size: 10,
        },
      };

      mockResponse(200, backendResponse);

      const products = await client.getProducts();

      // Ensure envelope extraction is done correctly and returns items array
      expect(Array.isArray(products)).toBe(true);
      expect(products).toHaveLength(2);

      // 1. price string -> number conversion
      expect(products[0]).toEqual({
        id: "p-1",
        name: "Product with Price String",
        sku: "SKU1",
        price: 150,
        unit: "pcs",
      });

      // 2. already frontend shape -> passed through unchanged
      expect(products[1]).toEqual({
        id: "p-2",
        name: "Product in Frontend Shape",
        sku: "SKU2",
        base_price: 200,
        unit: "pcs",
      });
    });

    it("normalizes paginated product metadata and price strings", async () => {
      mockResponse(200, {
        data: {
          items: [{ id: "p-1", name: "Croissant", price: "48000" }],
          total: 1,
          page: 1,
          size: 20,
          total_pages: 1,
        },
      });

      const page = await client.getProductsPage();

      expect(page.total_pages).toBe(1);
      expect(page.items[0]?.price).toBe(48000);
    });
  });

  describe("adaptBranch lat->region inference", () => {
    it("passes through branch fields without client-side region inference", async () => {
      const backendBranches = [
        { id: "br-north", name: "Northern Branch", lat: 21.0, lng: 105.8 },
        { id: "br-central", name: "Central Branch", lat: 16.0, lng: 108.2 },
        { id: "br-south", name: "Southern Branch", lat: 10.0, lng: 106.6 },
        { id: "br-preassigned", name: "Pre-assigned Branch", lat: 21.0, lng: 105.8, region: "south" },
        { id: "br-nolat", name: "No Latitude Branch", lng: 105.8 },
      ];

      mockResponse(200, { data: backendBranches });

      const branches = await client.getBranches();

      expect(branches).toHaveLength(5);

      expect(branches[0]?.region).toBeUndefined();
      expect(branches[1]?.region).toBeUndefined();
      expect(branches[2]?.region).toBeUndefined();
      expect(branches[3]?.region).toBe("south");
      expect(branches[4]?.region).toBeUndefined();
    });

    it("extracts branches from backend paginated envelopes", async () => {
      const branches = [{ id: "br-1", name: "Saigon" }];
      mockResponse(200, {
        data: {
          items: branches,
          total: 1,
          page: 1,
          size: 20,
          total_pages: 1,
        },
      });

      await expect(client.getBranches()).resolves.toEqual(branches);
    });
  });

  describe("Mock fallback and ApiHealth reporting", () => {
    it("falls back to mock product list when fetch fails or returns 404", async () => {
      // 1. Fetch failure
      fetchMock.mockRejectedValueOnce(new Error("Network connection error"));

      const resFail = await client.getProducts();
      expect(resFail).toEqual(mockProducts);
      expect(client.getApiHealth().mockServed).toContain("products.list");

      // Reset and test 404
      vi.restoreAllMocks();
      mockResponse(404, "Not Found", false);

      const res404 = await client.getProducts();
      expect(res404).toEqual(mockProducts);
    });
  });
});
