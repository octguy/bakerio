// Real API client for the Go backend. Auth, users, profiles, products,
// categories, branches, and branch membership use real /api/v1 endpoints.
// Orders still fall back to mock because the backend has no orders module.
// Mock-served endpoints are tracked so apps can surface a visible marker.
//
// To consume the marker from app code:
//   import { getApiHealth } from "@repo/api-client";
//   const { mockServed } = getApiHealth();

import type {
  Branch,
  BranchProduct,
  Category,
  CreateOrderRequest,
  CreateUserResponse,
  Order,
  Profile,
  Product,
  ProductImage,
} from "./types";
import {
  listProductImages as mockListProductImages,
  uploadProductImages as mockUploadProductImages,
  deleteProductImage as mockDeleteProductImage,
} from "./mock";

const MOCK_SERVED = new Set<string>();
const DISABLE_MOCK_FALLBACK =
  process.env.NEXT_PUBLIC_DISABLE_MOCK_FALLBACK === "true";

function markMock(key: string) {
  MOCK_SERVED.add(key);
}

function useMockFallback(key: string, message?: string, err?: unknown) {
  markMock(key);
  if (message && process.env.NODE_ENV !== "production") {
    console.info(message, err);
  }
}

export function getApiHealth(): { mockServed: string[] } {
  return { mockServed: [...MOCK_SERVED].sort() };
}

const BACKEND_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const API_PROXY_PATH = process.env.NEXT_PUBLIC_API_PROXY_PATH || "/api/backend";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return API_PROXY_PATH;
  }
  const proxyUrl = process.env.NEXT_PUBLIC_API_PROXY_URL?.trim();
  return proxyUrl
    ? trimTrailingSlash(proxyUrl)
    : trimTrailingSlash(BACKEND_API_BASE);
}

let token: string | null = null;

function headers(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const customHeaders = headers();
  if (opts?.body instanceof FormData) {
    delete (customHeaders as any)["Content-Type"];
  }
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: {
      ...customHeaders,
      ...opts?.headers,
    },
    ...opts,
  });
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

export async function register(
  email: string,
  password: string,
  full_name: string,
) {
  return request<{ id: string; email: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function logout() {
  await request("/auth/logout", { method: "POST" });
  token = null;
}

export function setToken(t: string) {
  token = t;
}
export function getToken() {
  return token;
}

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
  mockCategories,
} from "./mock";

export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    // Backend returns ProductListResponse {items,total,page,size}; legacy test
    // mocks return a bare array. Honor either; pass through 204→null.
    const raw = await request<Product[] | { items?: Product[] } | null>(
      "/products?size=500",
    );
    if (raw == null) return raw as unknown as Product[];
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.items)
        ? raw.items
        : [];
    return arr;
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.list",
      "[api-client] /products unavailable — using mock fixtures.",
      err,
    );
    return mockGetProducts();
  }
});

export async function getProductsPage(opts?: {
  category?: string;
  page?: number;
  size?: number;
}): Promise<{ items: Product[]; total: number; page: number; size: number }> {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const query = params.toString();

  try {
    return await request<{
      items: Product[];
      total: number;
      page: number;
      size: number;
    }>(`/products${query ? `?${query}` : ""}`);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.page",
      "[api-client] /products page unavailable — using mock fixtures.",
      err,
    );
    const items = await mockGetProducts();
    return {
      items,
      total: items.length,
      page: opts?.page ?? 1,
      size: opts?.size ?? 20,
    };
  }
}

export const getProduct = cache(async (idOrSlug: string): Promise<Product> => {
  try {
    return await request<Product>(`/products/${idOrSlug}`);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.get",
      "[api-client] /products/:id not available — using mock fixture.",
      err,
    );
    const found = await mockGetProduct(idOrSlug);
    if (found) return found;
    throw err;
  }
});

export async function createProduct(data: {
  name: string;
  category_id: string;
  price: number;
  sort_order?: number;
}) {
  const backendBody = {
    name: data.name,
    category_id: data.category_id,
    price: String(data.price),
    sort_order: data.sort_order ?? 0,
  };
  try {
    const res = await request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(backendBody),
    });
    return res;
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.create",
      "[api-client] /products POST not available — creating in mock.",
      err,
    );
    return mockCreateProduct(data as any);
  }
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    category_id: string;
    price: number;
    sort_order: number;
    is_active: boolean;
  },
) {
  const backendBody = {
    name: data.name,
    category_id: data.category_id,
    price: String(data.price),
    sort_order: data.sort_order,
    is_active: data.is_active,
  };
  try {
    const res = await request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(backendBody),
    });
    return res;
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.update",
      "[api-client] /products/:id PATCH not available — updating in mock.",
      err,
    );
    return mockUpdateProduct(id, data as any);
  }
}

export async function deleteProduct(id: string) {
  try {
    return await request<void>(`/products/${id}`, { method: "DELETE" });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.delete",
      "[api-client] /products/:id DELETE not available — removing from mock.",
      err,
    );
    return mockDeleteProduct(id);
  }
}

export async function listProductImages(productId: string): Promise<ProductImage[]> {
  try {
    return await request<ProductImage[]>(`/products/${productId}/images`);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.listImages",
      "[api-client] /products/:id/images GET not available — using mock.",
      err,
    );
    return mockListProductImages(productId);
  }
}

export async function uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  try {
    return await request<ProductImage[]>(`/products/${productId}/images`, {
      method: "POST",
      body: fd,
    });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.addImages",
      "[api-client] /products/:id/images POST not available — using mock.",
      err,
    );
    return mockUploadProductImages(productId, files);
  }
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  try {
    return await request<void>(`/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.deleteImage",
      "[api-client] /products/:id/images/:imageId DELETE not available — using mock.",
      err,
    );
    return mockDeleteProductImage(productId, imageId);
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
    useMockFallback(
      "categories.list",
      "[api-client] /categories not available — using mock fixtures.",
      err,
    );
    return mockGetCategories();
  }
});

export const getCategory = cache(async (id: string): Promise<Category> => {
  try {
    return await request<Category>(`/categories/${id}`);
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "categories.get",
      "[api-client] /categories/:id not available — using mock fixture.",
      err,
    );
    const found = mockCategories.find((c) => c.id === id || c.slug === id);
    if (found) return found;
    throw err;
  }
});

export async function createCategory(data: {
  name: string;
  sort_order?: number;
}) {
  const backendBody = {
    name: data.name,
    sort_order: data.sort_order ?? 0,
  };
  try {
    return await request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(backendBody),
    });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "categories.create",
      "[api-client] /categories POST not available — creating in mock.",
      err,
    );
    return mockCreateCategory(data);
  }
}

export async function updateCategory(
  id: string,
  data: {
    name: string;
    sort_order: number;
    is_active: boolean;
  },
) {
  try {
    return await request<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "categories.update",
      "[api-client] /categories/:id PATCH not available — updating in mock.",
      err,
    );
    return mockUpdateCategory(id, data);
  }
}

export async function deleteCategory(id: string) {
  try {
    return await request<void>(`/categories/${id}`, { method: "DELETE" });
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "categories.delete",
      "[api-client] /categories/:id DELETE not available — deleting in mock.",
      err,
    );
    return mockDeleteCategory(id);
  }
}

// ===== BRANCHES (REAL) =====

export const getBranches = cache(async (): Promise<Branch[]> => {
  try {
    const raw = await request<Branch[] | null>("/branch");
    if (!Array.isArray(raw)) return raw as unknown as Branch[];
    return raw;
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "branches.list",
      "[api-client] /branch not available — using mock fixtures.",
      err,
    );
    return mockGetBranches();
  }
});

export const getBranch = cache(async (id: string): Promise<Branch> => {
  return await request<Branch>(`/branch/${id}`);
});

export async function createBranch(data: {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}) {
  return request<Branch>("/branch", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBranch(
  id: string,
  data: Partial<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>,
) {
  return request<Branch>(`/branch/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateBranchStatus(
  id: string,
  status: "active" | "inactive",
) {
  return request<void>(`/branch/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function setBranchProductAvailability(
  branchId: string,
  productId: string,
  isActive: boolean,
): Promise<BranchProduct> {
  return request<BranchProduct>(`/branch/${branchId}/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  });
}

// Honest-demo: admin delete button is disabled because backend has no branch delete route.
export async function deleteBranch(_id: string): Promise<void> {
  throw new Error(
    "Branch deletion is not supported by the backend; deactivate via status instead.",
  );
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

export async function getBranchMembers(
  branchId: string,
): Promise<BranchMember[]> {
  const res = await request<BranchMembersResponse | null>(
    `/branch/${branchId}/members`,
  );
  return res?.members ?? [];
}

export async function assignBranchMember(
  branchId: string,
  userId: string,
): Promise<BranchMember> {
  return request<BranchMember>(`/branch/${branchId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeBranchMember(
  branchId: string,
  userId: string,
): Promise<void> {
  return request<void>(`/branch/${branchId}/members/${userId}`, {
    method: "DELETE",
  });
}

// ===== USERS (REAL) =====

export async function createUser(data: {
  email: string;
  full_name: string;
  password: string;
  role: string;
  branch_id?: string;
}): Promise<CreateUserResponse> {
  return request<CreateUserResponse>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUserProfile(id: string): Promise<Profile> {
  return request<Profile>(`/users/${id}/profile`);
}

export async function updateUserProfile(
  id: string,
  data: {
    display_name?: string;
    phone?: string;
    address?: string;
    avatar_url?: string;
    bio?: string;
  },
): Promise<Profile> {
  return request<Profile>(`/users/${id}/profile`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getMyProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}

export async function updateMyProfile(data: {
  display_name?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  bio?: string;
}): Promise<Profile> {
  return request<Profile>("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return request<void>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function setUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  return request<void>(`/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

// ===== ORDERS (MOCK — backend not implemented) =====

import {
  createOrder as mockCreateOrder,
  getOrders as mockGetOrders,
  getOrder as mockGetOrder,
  updateOrderStatus as mockUpdateOrderStatus,
  getOrderStats as mockGetOrderStats,
  reorderItems as mockReorderItems,
} from "./mock";

export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  return mockCreateOrder(data);
}
export const getOrders = mockGetOrders;
export const getOrder = mockGetOrder;
export const updateOrderStatus = mockUpdateOrderStatus;
export const getOrderStats = mockGetOrderStats;
export const reorderItems = mockReorderItems;
