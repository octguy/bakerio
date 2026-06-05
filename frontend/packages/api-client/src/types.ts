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
  is_primary?: boolean;
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

export interface BranchProductDetail {
  product_id: string;
  branch_id: string;
  name: string;
  slug: string;
  price: number | string;
  is_active: boolean;
  quantity: number;
  product_active: boolean;
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

export interface OrderBranchOption {
  branch_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_km?: number;
  shipping_fee: number | string;
  total: number | string;
  routing_note: string;
}

export interface OrderMissingItem {
  product_id: string;
  name: string;
  requested: number;
  max_available: number;
}

export interface FindOrderBranchesRequest {
  shipping_address: string;
  shipping_latitude?: number;
  shipping_longitude?: number;
  items: CreateOrderItemInput[];
}

export interface FindOrderBranchesResponse {
  subtotal: number | string;
  options: OrderBranchOption[];
  missing: OrderMissingItem[];
}

export interface SelectOrderBranchRequest extends FindOrderBranchesRequest {
  branch_id: string;
  contact_phone?: string;
  note?: string;
  voucher_code?: string;
}

export interface SelectOrderBranchResponse {
  session_id: string;
  branch_id: string;
  branch_name: string;
  subtotal: number | string;
  shipping_fee: number | string;
  discount_amount: number | string;
  total: number | string;
  voucher_code?: string;
  distance_km?: number;
  items: Array<{
    product_id: string;
    name: string;
    unit_price: number | string;
    quantity: number;
    line_total: number | string;
  }>;
  expires_at: string;
  ttl_seconds: number;
}

export interface CartItemResponse {
  id: string;
  product_id: string;
  name: string;
  price: number | string;
  quantity: number;
  line_total: number | string;
  available: boolean;
  slug?: string;
}

export interface CartResponse {
  items: CartItemResponse[];
  total: number | string;
  count: number | string;
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

export type BranchProductDetailListResponse = PaginatedResponse<BranchProductDetail>;

export interface StatisticsOverview {
  total_customers: number;
  total_branches: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  total_discount: number;
  vouchers_redeemed: number;
  tier_bronze: number;
  tier_silver: number;
  tier_gold: number;
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
