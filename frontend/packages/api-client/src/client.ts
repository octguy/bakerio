// Real API client for the Go backend. Auth, users, profiles, products,
// categories, branches, and branch membership use real /api/v1 endpoints.
// Orders still fall back to mock because the backend has no orders module.
// Mock-served endpoints are tracked so apps can surface a visible marker.
//
// To consume the marker from app code:
//   import { getApiHealth } from "@repo/api-client";
//   const { mockServed } = getApiHealth();

import type {
  Product,
  Category,
  ProductImage,
  Branch,
  BranchProduct,
  BranchProductDetail,
  Profile,
  Order,
  CartResponse,
  CartItemResponse,
  CreateUserResponse,
  LoginResponse,
  User,
  PaginatedResponse,
  CreateOrderRequest,
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
let authRedirecting = false;

function isInvalidTokenError(status: number, json: unknown, adminAuthInvalid: boolean): boolean {
  if (!adminAuthInvalid || status !== 401 || !json || typeof json !== "object") return false;
  const error = (json as { error?: { code?: string; message?: string } }).error;
  if (error?.code !== "UNAUTHORIZED") return false;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("invalid token") || message.includes("token has been revoked");
}

async function redirectToLoginAfterInvalidToken(json: unknown, status: number, adminAuthInvalid: boolean) {
  if (
    authRedirecting ||
    typeof window === "undefined" ||
    !isInvalidTokenError(status, json, adminAuthInvalid)
  ) {
    return;
  }

  authRedirecting = true;
  token = null;
  await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  }).catch(() => undefined);

  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("next", next);
  window.location.assign(loginUrl.toString());
}

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
    let parsedError: unknown;
    try {
      parsedError = JSON.parse(text);
      const json = parsedError as { error?: { message?: string }; message?: string };
      errorMsg = json.error?.message || json.message || text;
    } catch {}
    await redirectToLoginAfterInvalidToken(
      parsedError,
      res.status,
      res.headers.get("x-admin-auth-invalid") === "1",
    );
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

type ProductListResponse = PaginatedResponse<Product>;
type BranchListResponse = PaginatedResponse<Branch>;

function normalizeProduct(product: Product): Product {
  if (product.price == null) return product;
  return {
    ...product,
    price: Number(product.price),
  };
}

function unwrapItems<T>(raw: T[] | { items?: T[] } | null): T[] {
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
}

export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    // Backend clamps size to 100 and returns ProductListResponse; legacy tests
    // may return a bare array. Honor either; pass through 204→[].
    const raw = await request<Product[] | ProductListResponse | null>(
      "/products?size=100",
    );
    return unwrapItems(raw).map(normalizeProduct);
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
  q?: string;
  category?: string;
  active?: boolean;
  page?: number;
  size?: number;
}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.category) params.set("category", opts.category);
  if (opts?.active != null) params.set("active", String(opts.active));
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const query = params.toString();

  try {
    const page = await request<ProductListResponse>(
      `/products${query ? `?${query}` : ""}`,
    );
    return {
      ...page,
      items: unwrapItems(page).map(normalizeProduct),
      total_pages: page.total_pages ?? Math.ceil(page.total / page.size),
    };
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "products.page",
      "[api-client] /products page unavailable — using mock fixtures.",
      err,
    );
    let items = await mockGetProducts(opts?.category);
    if (opts?.q) {
      const q = opts.q.toLowerCase();
      items = items.filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          product.slug.toLowerCase().includes(q),
      );
    }
    if (opts?.active != null) {
      items = items.filter((product) => product.is_active === opts.active);
    }
    return {
      items: items.slice(
        ((opts?.page ?? 1) - 1) * (opts?.size ?? 20),
        (opts?.page ?? 1) * (opts?.size ?? 20),
      ),
      total: items.length,
      page: opts?.page ?? 1,
      size: opts?.size ?? 20,
      total_pages: Math.ceil(items.length / (opts?.size ?? 20)),
    };
  }
}

export const getProduct = cache(async (idOrSlug: string): Promise<Product> => {
  try {
    return normalizeProduct(await request<Product>(`/products/${idOrSlug}`));
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
  slug?: string;
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
    return normalizeProduct(res);
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
    return normalizeProduct(res);
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
  if (files.length === 0) return [];
  const fd = new FormData();
  files.forEach((file) => fd.append("files", file, file.name));
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

export const getCategories = cache(async (opts?: { q?: string }): Promise<Category[]> => {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  const query = params.toString();

  try {
    const cats = await request<Category[]>(`/categories${query ? `?${query}` : ""}`);
    if (!cats || cats.length === 0) {
      if (DISABLE_MOCK_FALLBACK) return cats || [];
      useMockFallback("categories.empty");
      return filterMockCategories(await mockGetCategories(), opts?.q);
    }
    return cats;
  } catch (err) {
    if (DISABLE_MOCK_FALLBACK) throw err;
    useMockFallback(
      "categories.list",
      "[api-client] /categories not available — using mock fixtures.",
      err,
    );
    return filterMockCategories(await mockGetCategories(), opts?.q);
  }
});

function filterMockCategories(categories: Category[], q?: string): Category[] {
  if (!q) return categories;
  const term = q.toLowerCase();
  return categories.filter(
    (category) =>
      category.name.toLowerCase().includes(term) ||
      category.slug.toLowerCase().includes(term),
  );
}

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

export async function getBranchesPage(opts?: {
  q?: string;
  page?: number;
  size?: number;
}): Promise<BranchListResponse> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const query = params.toString();

  const raw = await request<Branch[] | BranchListResponse | null>(
    `/branch${query ? `?${query}` : ""}`,
  );
  if (Array.isArray(raw)) {
    return {
      items: raw,
      total: raw.length,
      page: opts?.page ?? 1,
      size: opts?.size ?? raw.length,
      total_pages: 1,
    };
  }
  return raw ?? { items: [], total: 0, page: opts?.page ?? 1, size: opts?.size ?? 0, total_pages: 1 };
}

export const getBranches = cache(async (): Promise<Branch[]> => {
  try {
    return (await getBranchesPage({ size: 100 })).items;
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

export async function getBranchProducts(
  branchId: string,
  opts?: { active?: boolean; page?: number; size?: number },
): Promise<PaginatedResponse<BranchProductDetail>> {
  const params = new URLSearchParams();
  if (opts?.active != null) params.set("active", String(opts.active));
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const query = params.toString();
  const raw = await request<PaginatedResponse<BranchProductDetail> | null>(
    `/branch/${branchId}/products${query ? `?${query}` : ""}`,
  );
  return raw ?? { items: [], total: 0, page: opts?.page ?? 1, size: opts?.size ?? 0, total_pages: 1 };
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

export interface StaffUser {
  user_id: string;
  display_name: string;
  email: string;
  roles: string[];
  branch_id?: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export async function getUsersPage(opts?: {
  q?: string;
  role?: string;
  page?: number;
  size?: number;
}): Promise<UsersResponse> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.role) params.set("role", opts.role);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const res = await request<UsersResponse | null>(`/users?${params.toString()}`);
  const items = res?.items ?? [];
  const size = res?.size ?? opts?.size ?? items.length;
  const total = res?.total ?? items.length;
  return {
    items,
    total,
    page: res?.page ?? opts?.page ?? 1,
    size,
    total_pages: res?.total_pages ?? Math.max(1, Math.ceil(total / Math.max(1, size))),
  };
}

export interface StaffUsersPage {
  items: StaffUser[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
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

interface StaffUsersResponse {
  items: StaffUser[];
  total?: number;
  page?: number;
  size?: number;
  total_pages?: number;
}

export async function getStaffUsersPage(opts?: {
  q?: string;
  page?: number;
  size?: number;
}): Promise<StaffUsersPage> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const res = await request<StaffUsersResponse | null>(`/staff?${params.toString()}`);
  const items = res?.items ?? [];
  const size = res?.size ?? opts?.size ?? items.length;
  const total = res?.total ?? items.length;
  return {
    items,
    total,
    page: res?.page ?? opts?.page ?? 1,
    size,
    total_pages: res?.total_pages ?? Math.max(1, Math.ceil(total / Math.max(1, size))),
  };
}

export async function getStaffUsers(opts?: { q?: string }): Promise<StaffUser[]> {
  const page = await getStaffUsersPage({ q: opts?.q, size: 100 });
  return page.items;
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

// ===== CART (REAL) =====

export async function getCart(): Promise<CartResponse> {
  return request<CartResponse>("/cart");
}

export async function addCartItem(productId: string, quantity: number): Promise<CartResponse> {
  return request<CartResponse>("/cart/items", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
  return request<CartResponse>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  return request<CartResponse>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function clearCart(): Promise<void> {
  return request<void>("/cart", {
    method: "DELETE",
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

// ===== CUSTOMER ADDRESSES (MOCK — backend not implemented) =====
import {
  getAddresses as mockGetAddresses,
  addAddress as mockAddAddress,
  removeAddress as mockRemoveAddress,
  setDefaultAddress as mockSetDefaultAddress,
} from "./mock";

export const getAddresses = mockGetAddresses;
export const addAddress = mockAddAddress;
export const removeAddress = mockRemoveAddress;
export const setDefaultAddress = mockSetDefaultAddress;
