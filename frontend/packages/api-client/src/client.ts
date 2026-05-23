// Real API client — connects to Go backend for available endpoints,
// falls back to mock for unimplemented modules (orders, inventory, payment, delivery)

import type { Product, Category, Branch, Order, OrderItem, User } from "./types";

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
  getCategories as mockGetCategories
} from "./mock";

export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    return await request<Product[]>("/products");
  } catch (err) {
    console.warn("getProducts backend failed, falling back to mock:", err);
    return mockGetProducts();
  }
});

export const getProduct = cache(async (idOrSlug: string): Promise<Product> => {
  try {
    return await request<Product>(`/products/${idOrSlug}`);
  } catch (err) {
    console.warn("getProduct backend failed, falling back to mock:", err);
    const found = await mockGetProduct(idOrSlug);
    if (found) return found;
    throw err;
  }
});

export async function createProduct(data: { sku: string; name: string; unit: string; price: number; description?: string; category_id?: string }) {
  try {
    return await request<Product>("/products", { method: "POST", body: JSON.stringify(data) });
  } catch (err) {
    console.warn("createProduct backend failed, falling back to mock:", err);
    return mockCreateProduct(data);
  }
}

export async function updateProduct(id: string, data: Partial<{ name: string; description: string; unit: string; is_active: boolean; base_price: number }>) {
  try {
    return await request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  } catch (err) {
    console.warn("updateProduct backend failed, falling back to mock:", err);
    return mockUpdateProduct(id, data);
  }
}

export async function deleteProduct(id: string) {
  try {
    return await request<void>(`/products/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteProduct backend failed, falling back to mock:", err);
    return mockDeleteProduct(id);
  }
}

// ===== CATEGORIES (REAL) =====

export const getCategories = cache(async (): Promise<Category[]> => {
  try {
    const cats = await request<Category[]>("/categories");
    if (!cats || cats.length === 0) return mockGetCategories();
    return cats;
  } catch (err) {
    console.warn("getCategories backend failed, falling back to mock:", err);
    return mockGetCategories();
  }
});

export const getCategory = cache(async (id: string): Promise<Category> => {
  try {
    return await request<Category>(`/categories/${id}`);
  } catch (err) {
    console.warn("getCategory backend failed, falling back to mock:", err);
    const { mockCategories } = await import("./mock");
    const found = mockCategories.find((c) => c.id === id || c.slug === id);
    if (found) return found;
    throw err;
  }
});

export async function createCategory(data: { name: string; parent_id?: string; sort_order?: number }) {
  return request<Category>("/categories", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCategory(id: string, data: { name: string; parent_id?: string; sort_order?: number; is_active?: boolean }) {
  return request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteCategory(id: string) {
  return request<void>(`/categories/${id}`, { method: "DELETE" });
}

// ===== BRANCHES (REAL) =====

export const getBranches = cache(async (): Promise<Branch[]> => {
  return request<Branch[]>("/branch");
});

export const getBranch = cache(async (id: string): Promise<Branch> => {
  return request<Branch>(`/branch/${id}`);
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

// ===== SUPPLIERS (REAL) =====

export async function getSuppliers(region?: string) {
  const q = region ? `?region=${region}` : "";
  return request<any[]>(`/suppliers${q}`);
}

export async function createSupplier(data: { name: string; region: string; contact_info?: string }) {
  return request<any>("/suppliers", { method: "POST", body: JSON.stringify(data) });
}

// ===== PROCUREMENT (REAL) =====

export async function getProcurementOrders() {
  return request<any[]>("/procurement/orders");
}

export async function createProcurementOrder(data: { supplier_id: string; note?: string; items: { product_id: string; quantity: number; unit_price: number }[] }) {
  return request<any>("/procurement/orders", { method: "POST", body: JSON.stringify(data) });
}

export async function updateProcurementStatus(id: string, status: string) {
  return request<any>(`/procurement/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
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

import { createOrder as mockCreateOrder, getOrders as mockGetOrders, getOrder as mockGetOrder, updateOrderStatus as mockUpdateOrderStatus } from "./mock";

export const createOrder = mockCreateOrder;
export const getOrders = mockGetOrders;
export const getOrder = mockGetOrder;
export const updateOrderStatus = mockUpdateOrderStatus;
