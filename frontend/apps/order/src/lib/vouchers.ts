import { getPublicVouchers, type PublicVoucher } from "@repo/api-client";
import type { Coupon } from "@/types";

// Backend vouchers are always percentage-based with optional caps. Map them
// onto the local Coupon shape the cart store already understands.
export function voucherToCoupon(voucher: PublicVoucher): Coupon {
  const cap = voucher.max_discount ? Number(voucher.max_discount) : undefined;
  const min = voucher.min_subtotal ? Number(voucher.min_subtotal) : undefined;
  return {
    code: voucher.code,
    description: `Giảm ${voucher.discount_percent}%${cap ? ` (tối đa ${cap.toLocaleString("vi-VN")}₫)` : ""}`,
    discountType: "percent",
    discountValue: voucher.discount_percent,
    minOrder: Number.isNaN(min ?? NaN) ? undefined : min,
    maxDiscount: Number.isNaN(cap ?? NaN) ? undefined : cap,
  };
}

// Replaces the previous hardcoded coupon list with the live customer-facing
// voucher feed (GET /vouchers).
export async function getAvailableCoupons(): Promise<Coupon[]> {
  const res = await getPublicVouchers();
  return res.items.map(voucherToCoupon);
}
