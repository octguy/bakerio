// Real API client — connects to Go backend for available endpoints,
// falls back to mock for unimplemented modules (orders, suppliers, procurement,
// products until backend ships, etc.). See the API audit for the full split.
//
// Audit §I pull-quote: three modules in this file used to read as real and
// weren't (products, suppliers, procurement). Fallback was a silent
// console.warn, which masks broken backends. We now:
//   * track which endpoints have been served by mock during this session,
//     so the admin can surface a visible "mock served" marker.
//   * point suppliers/procurement directly at local stubs, no fetch attempt.
//
// To consume the marker from app code:
//   import { getApiHealth } from "@repo/api-client";
//   const { mockServed } = getApiHealth();

import type { Branch, Category, CreateOrderRequest, Order, Product } from "./types";

const MOCK_SERVED = new Set<string>();
const DISABLE_MOCK_FALLBACK = process.env.NEXT_PUBLIC_DISABLE_MOCK_FALLBACK === "true";

function markMock(key: string) {
  MOCK_SERVED.add(key);
}

function useMockFallback(key: string, message?: string, err?: unknown) {
  markMock(key);
  if (message && process.env.NODE_ENV !== "production") {
    console.info(message, err);
  }
}

// adaptProduct maps the Go ProductResponse shape (price as decimal, category_id)
// onto the frontend Product type (base_price, optional category). It is a no-op
// for already-frontend-shaped payloads (mocks and tests).
function adaptProduct(p: any): Product {
  if (!p || typeof p !== "object") return p as Product;
  let adapted = p;
  if (p.base_price === undefined && p.price !== undefined) {
    const priceNum = typeof p.price === "string" ? parseFloat(p.price) : Number(p.price);
    adapted = { ...p, base_price: Number.isFinite(priceNum) ? priceNum : 0 };
  }
  if (adapted.category_id && !adapted.category) {
    adapted = {
      ...adapted,
      category: {
        id: adapted.category_id,
        name: "",
        slug: "",
        sort_order: 0,
        is_active: true,
      },
    };
  }
  return adapted as Product;
}

// adaptBranch fills the frontend Branch.region field — the Go BranchResponse
// has no region; we infer north/south/central from latitude when present.
// Pass through unchanged when there's no lat to derive from, so mock fixtures
// and tests stay shape-equal.
function adaptBranch(b: any): Branch {
  if (!b || typeof b !== "object") return b as Branch;
  if (b.region) return b as Branch;
  const lat = typeof b.lat === "number" ? b.lat : Number.NaN;
  if (!Number.isFinite(lat)) return b as Branch;
  const region = lat >= 20 ? "north" : lat >= 14 ? "central" : "south";
  return { ...b, region };
}

export function getApiHealth(): { mockServed: string[] } {
  return { mockServed: [...MOCK_SERVED].sort() };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

let token: string | null = null;

function headers(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers(), ...opts });
  if (res.status === 204) {
    return null as unknown as T;
  }
  const text = await res.text();
  if (!res.ok) {
    if (!text) {
      throw new Error(`HTTP error ${res.status} from ${path}`);
    }
    let errorMsg = text;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error?.message || json.message || text;
    } catch {}
    throw new Error(errorMsg);
  }
  if (!text) {
    return null as unknown as T;
  }
  let json: { data?: T; error?: { message: string } };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${path}: ${text.slice(0, 100)}`);
  }
  if (json.error) throw new Error(json.error.message);
  return json.data as T;
}

// ===== AUTH (REAL) =====

export async function login(email: string, password: string) {
  const data = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  token = data.access_token;
  return data;
}

export async function register(email: string, password: string, full_name: string) {
  return request<{ id: string; email: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function logout() {
  await request("/auth/logout", { method: "POST" });
  token = null;
}

export function setToken(t: string) { token = t; }
export function getToken() { return token; }

// ===== PRODUCTS (REAL) =====

import { cache } from "react";

import { 
  getProducts as mockGetProducts, 
  getProduct as mockGetProduct, 
  createProduct as mockCreateProduct, 
  updateProduct as mockUpdateProduct, 
  deleteProduct as mockDeleteProduct,
  getCategories as mockGetCategories,
  createCategory as mockCreateCategory,
  updateCategory as mockUpdateCategory,
  deleteCategory as mockDeleteCategory,
  getBranches as mockGetBranches,
  mockCategories
} from "./mock";

export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    // Backend returns ProductListResponse {items,total,page,size}; legacy test
    // mocks return a bare array. Honor either; pass through 204→null.
    const raw = await request<Product[] | { items?: Product[] } | null>("/products");
    if (raw == null) return raw as unknown as Product[];
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
    return arr.map(adaptProduct);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("products.list", "[api-client] /products unavailable — using mock fixtures.", err);
    return mockGetProducts();
  }
});

export const getProduct = cache(async (idOrSlug: string): Promise<Product> => {
  try {
    const raw = await request<Product>(`/products/${idOrSlug}`);
    return adaptProduct(raw);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("products.get", "[api-client] /products/:id not available — using mock fixture.", err);
    const found = await mockGetProduct(idOrSlug);
    if (found) return found;
    throw err;
  }
});

// Audit §II DTO drift: frontend keeps {sku, base_price, unit, allergens}; Go
// CreateProductRequest only knows {name, category_id, price, sort_order}. We
// translate base_price→price (string decimal) and drop fields the backend
// doesn't accept. sku/unit/description/allergens remain client-side only.
export async function createProduct(data: {
  sku: string;
  slug: string;
  name: string;
  unit: string;
  base_price: number;
  description?: string;
  category_id?: string;
  allergens?: string[];
}) {
  const backendBody = {
    name: data.name,
    slug: data.slug,
    category_id: data.category_id,
    price: String(data.base_price),
    sort_order: 0,
  };
  try {
    const res = await request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(backendBody),
    });
    return adaptProduct(res);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("products.create", "[api-client] /products POST not available — creating in mock.", err);
    return mockCreateProduct(data);
  }
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    unit: string;
    is_active: boolean;
    base_price: number;
    category_id: string;
    slug: string;
    allergens: string[];
  }>,
) {
  const backendBody: Record<string, unknown> = {};
  if (data.name !== undefined) backendBody.name = data.name;
  if (data.base_price !== undefined) backendBody.price = String(data.base_price);
  if (data.is_active !== undefined) backendBody.is_active = data.is_active;
  if (data.category_id !== undefined) backendBody.category_id = data.category_id;
  if (data.slug !== undefined) backendBody.slug = data.slug;
  try {
    const res = await request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(backendBody),
    });
    return adaptProduct(res);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("products.update", "[api-client] /products/:id PATCH not available — updating in mock.", err);
    return mockUpdateProduct(id, data);
  }
}

export async function deleteProduct(id: string) {
  try {
    return await request<void>(`/products/${id}`, { method: "DELETE" });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("products.delete", "[api-client] /products/:id DELETE not available — removing from mock.", err);
    return mockDeleteProduct(id);
  }
}

// ===== CATEGORIES (REAL) =====

export const getCategories = cache(async (): Promise<Category[]> => {
  try {
    const cats = await request<Category[]>("/categories");
    if (!cats || cats.length === 0) {
      if (DISABLE_MOCK_FALLBACK) return cats || [];
      useMockFallback("categories.empty");
      return mockGetCategories();
    }
    return cats;
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("categories.list", "[api-client] /categories not available — using mock fixtures.", err);
    return mockGetCategories();
  }
});

export const getCategory = cache(async (id: string): Promise<Category> => {
  try {
    return await request<Category>(`/categories/${id}`);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("categories.get", "[api-client] /categories/:id not available — using mock fixture.", err);
    const found = mockCategories.find((c) => c.id === id || c.slug === id);
    if (found) return found;
    throw err;
  }
});

export async function createCategory(data: { name: string; parent_id?: string; sort_order?: number }) {
  try {
    return await request<Category>("/categories", { method: "POST", body: JSON.stringify(data) });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("categories.create", "[api-client] /categories POST not available — creating in mock.", err);
    return mockCreateCategory(data);
  }
}

export async function updateCategory(id: string, data: { name: string; parent_id?: string; sort_order?: number; is_active?: boolean }) {
  try {
    return await request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("categories.update", "[api-client] /categories/:id PATCH not available — updating in mock.", err);
    return mockUpdateCategory(id, data);
  }
}

export async function deleteCategory(id: string) {
  try {
    return await request<void>(`/categories/${id}`, { method: "DELETE" });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("categories.delete", "[api-client] /categories/:id DELETE not available — deleting in mock.", err);
    return mockDeleteCategory(id);
  }
}

// ===== BRANCHES (REAL) =====

export const getBranches = cache(async (): Promise<Branch[]> => {
  try {
    const raw = await request<Branch[] | null>("/branch");
    if (!Array.isArray(raw)) return raw as unknown as Branch[];
    return raw.map(adaptBranch);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback("branches.list", "[api-client] /branch not available — using mock fixtures.", err);
    return mockGetBranches();
  }
});

export const getBranch = cache(async (id: string): Promise<Branch> => {
  const raw = await request<Branch>(`/branch/${id}`);
  return adaptBranch(raw);
});

export async function createBranch(data: { name: string; address: string; region: string; lat?: number; lng?: number }) {
  return request<Branch>("/branch", { method: "POST", body: JSON.stringify(data) });
}

export async function updateBranch(id: string, data: Partial<{ name: string; address: string; region: string; lat: number; lng: number }>) {
  return request<Branch>(`/branch/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteBranch(id: string) {
  return request<void>(`/branch/${id}`, { method: "DELETE" });
}

// ===== BRANCH MEMBERSHIP (REAL) =====

export interface BranchMember {
  user_id: string;
  display_name: string;
  email: string;
  roles: string[];
}

interface BranchMembersResponse {
  branch_id: string;
  members: BranchMember[];
}

export async function getBranchMembers(branchId: string): Promise<BranchMember[]> {
  const res = await request<BranchMembersResponse | null>(`/branch/${branchId}/members`);
  return res?.members ?? [];
}

export async function assignBranchMember(branchId: string, userId: string): Promise<BranchMember> {
  return request<BranchMember>(`/branch/${branchId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeBranchMember(branchId: string, userId: string): Promise<void> {
  return request<void>(`/branch/${branchId}/members/${userId}`, { method: "DELETE" });
}

// ===== SUPPLIERS (MOCK — audit §I: no backend module) =====
// Calls used to hit /suppliers and 404. Wired to a local stub so apps don't
// silently break; if the backend ships, swap the import.

export interface SupplierRow {
  id: string;
  name: string;
  region: string;
  contact_info?: string;
}

const MOCK_SUPPLIERS: SupplierRow[] = [
  { id: "sup-1", name: "Lê & Sons", region: "Lâm Đồng", contact_info: "+84 263 1100" },
  { id: "sup-2", name: "Saigon Imports", region: "HCMC", contact_info: "+84 28 3822" },
  { id: "sup-3", name: "Long An Farm", region: "Long An", contact_info: "+84 272 4000" },
  { id: "sup-4", name: "Trần family", region: "Long An" },
  { id: "sup-5", name: "Đà Lạt Co.", region: "Lâm Đồng" },
  { id: "sup-6", name: "Vinamilk", region: "HCMC" },
];

export async function getSuppliers(region?: string): Promise<SupplierRow[]> {
  markMock("suppliers.list");
  await new Promise((r) => setTimeout(r, 80));
  return region ? MOCK_SUPPLIERS.filter((s) => s.region === region) : MOCK_SUPPLIERS;
}

export async function createSupplier(data: { name: string; region: string; contact_info?: string }): Promise<SupplierRow> {
  markMock("suppliers.create");
  await new Promise((r) => setTimeout(r, 120));
  const row: SupplierRow = { id: `sup-${Date.now()}`, ...data };
  MOCK_SUPPLIERS.push(row);
  return row;
}

// ===== PROCUREMENT (MOCK — audit §I: no backend module) =====

export type ProcurementStatus = "DRAFT" | "ORDERED" | "DELIVERED" | "CANCELLED";

export interface ProcurementOrder {
  id: string;
  supplier_id: string;
  status: ProcurementStatus;
  note?: string;
  items: { product_id: string; quantity: number; unit_price: number }[];
  created_at: string;
}

const MOCK_PROCUREMENT: ProcurementOrder[] = [];

export async function getProcurementOrders(): Promise<ProcurementOrder[]> {
  markMock("procurement.list");
  await new Promise((r) => setTimeout(r, 80));
  return [...MOCK_PROCUREMENT].reverse();
}

export async function createProcurementOrder(data: {
  supplier_id: string;
  note?: string;
  items: { product_id: string; quantity: number; unit_price: number }[];
}): Promise<ProcurementOrder> {
  markMock("procurement.create");
  await new Promise((r) => setTimeout(r, 200));
  const order: ProcurementOrder = {
    id: `po-${1000 + MOCK_PROCUREMENT.length + 1}`,
    supplier_id: data.supplier_id,
    status: "DRAFT",
    note: data.note,
    items: data.items,
    created_at: new Date().toISOString(),
  };
  MOCK_PROCUREMENT.push(order);
  return order;
}

export async function updateProcurementStatus(id: string, status: ProcurementStatus): Promise<ProcurementOrder | null> {
  markMock("procurement.update");
  await new Promise((r) => setTimeout(r, 120));
  const idx = MOCK_PROCUREMENT.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const current = MOCK_PROCUREMENT[idx];
  if (!current) return null;
  current.status = status;
  return current;
}

// ===== USERS (REAL) =====

export async function createUser(data: { email: string; full_name: string; password: string; role: string; branch_id?: string }) {
  return request<any>("/users", { method: "POST", body: JSON.stringify(data) });
}

export async function getUserProfile(id: string) {
  return request<any>(`/users/${id}/profile`);
}

export async function getMyProfile() {
  return request<any>("/profile");
}

export async function updateMyProfile(data: { display_name?: string; avatar_url?: string; bio?: string }) {
  return request<any>("/profile", { method: "PATCH", body: JSON.stringify(data) });
}

// ===== ORDERS (MOCK — backend not implemented) =====

import {
  createOrder as mockCreateOrder,
  getOrders as mockGetOrders,
  getOrder as mockGetOrder,
  updateOrderStatus as mockUpdateOrderStatus,
  getOrderStats as mockGetOrderStats,
  reorderItems as mockReorderItems
} from "./mock";

export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  return mockCreateOrder(data);
}
export const getOrders = mockGetOrders;
export const getOrder = mockGetOrder;
export const updateOrderStatus = mockUpdateOrderStatus;
export const getOrderStats = mockGetOrderStats;
export const reorderItems = mockReorderItems;
