import { Coupon } from '@/types';

export const coupons: Coupon[] = [
  { code: 'WELCOME10', description: 'Giảm 10% cho đơn đầu tiên', discountType: 'percent', discountValue: 10 },
  { code: 'FREESHIP', description: 'Miễn phí giao hàng (giảm 25.000₫)', discountType: 'fixed', discountValue: 25000 },
  { code: 'CAKE20K', description: 'Giảm 20.000₫ cho đơn bánh từ 100.000₫', discountType: 'fixed', discountValue: 20000, minOrder: 100000 },
  { code: 'VIP15', description: 'Giảm 15% tối đa 50.000₫', discountType: 'percent', discountValue: 15, maxDiscount: 50000 },
];
