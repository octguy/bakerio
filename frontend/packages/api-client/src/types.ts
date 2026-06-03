// Types matching the Go backend DTOs

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;

  lat?: number;
  lng?: number;
  status: string;
  created_at: string;
}

export interface BranchBrief {
  id: string;
  name: string;
  address: string;
}

export interface BranchProduct {
  product_id: string;
  branch_id: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  bio?: string;
  roles?: string[];
  branch?: BranchBrief;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  branch?: BranchBrief;
  created_at: string;
}

export interface Order {
  id: string;
  branch_id: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  subtotal_amount?: number;
  fulfillment_mode?: OrderFulfillmentMode;
  payment_method?: string;
  delivery_address?: string;
  requested_time?: string;
  delivery_fee_amount?: number;
  loyalty_discount_amount?: number;
  crumbs_redeemed?: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

export type OrderFulfillmentMode = "PICKUP" | "DELIVERY";

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  branch_id: string;
  items: CreateOrderItemInput[];
  fulfillment_mode: OrderFulfillmentMode;
  delivery_address?: string;
  requested_time: string;
  payment_method: string;
  delivery_fee_amount: number;
  loyalty_discount_amount: number;
  crumbs_redeemed?: number;
  subtotal_amount: number;
  total_amount: number;
  note?: string;
}

export interface CartItemResponse {
  id: string;
  product_id: string;
  quantity: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  total: number;
  count: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  branch_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface GetOrdersOptions {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  is_default?: boolean;
  lat?: number;
  lng?: number;
}
