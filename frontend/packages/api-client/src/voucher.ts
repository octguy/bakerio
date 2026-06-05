import { request } from "./client";

export interface Voucher {
  id: string;
  code: string;
  discount_percent: number;
  max_discount?: string;
  min_subtotal?: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicVoucher {
  code: string;
  discount_percent: number;
  max_discount?: string;
  min_subtotal?: string;
  valid_from: string;
  valid_to: string;
}

export interface VoucherListResponse {
  items: Voucher[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface PublicVoucherListResponse {
  items: PublicVoucher[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface CreateVoucherRequest {
  code: string;
  discount_percent: number;
  max_discount?: string;
  min_subtotal?: string;
  valid_from: string;
  valid_to: string;
  is_active?: boolean;
}

export interface UpdateVoucherRequest {
  discount_percent?: number;
  max_discount?: string | null;
  min_subtotal?: string | null;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

export async function getAdminVouchers(opts?: {
  active?: boolean;
  page?: number;
  size?: number;
}): Promise<VoucherListResponse> {
  const params = new URLSearchParams();
  if (opts?.active !== undefined) params.set("active", String(opts.active));
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.size != null) params.set("size", String(opts.size));
  const res = await request<VoucherListResponse | null>(`/admin/vouchers?${params.toString()}`);
  return (
    res ?? {
      items: [],
      total: 0,
      page: opts?.page ?? 1,
      size: opts?.size ?? 20,
      total_pages: 1,
    }
  );
}

export async function getAdminVoucher(id: string): Promise<Voucher> {
  return request<Voucher>(`/admin/vouchers/${id}`);
}

export async function createVoucher(data: CreateVoucherRequest): Promise<Voucher> {
  return request<Voucher>("/admin/vouchers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVoucher(id: string, data: UpdateVoucherRequest): Promise<Voucher> {
  return request<Voucher>(`/admin/vouchers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getPublicVouchers(): Promise<PublicVoucherListResponse> {
  const res = await request<PublicVoucherListResponse | null>("/vouchers");
  return (
    res ?? {
      items: [],
      total: 0,
      page: 1,
      size: 20,
      total_pages: 1,
    }
  );
}
