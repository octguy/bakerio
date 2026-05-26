// Types matching the Go backend DTOs

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  unit: string;
  is_active: boolean;
  category?: Category;
  images?: ProductImage[];
  /** Optional client-side field; not yet on the backend DTO — see API audit § III. */
  allergens?: string[];
  /** Optional client-side field for "★ / New / ✦" badges on cards. */
  tag?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  status: string;
  region: string;
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

export interface CartItem {
  product: Product;
  quantity: number;
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
