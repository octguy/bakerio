import type { CartResponse } from '@repo/api-client';
import type { CartItem } from '@/types';

/** Convert possibly numeric/string values to a number, fallback 0 */
export function toCartNumber(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Map backend CartResponse to frontend CartItem[] */
export function cartResponseToItems(cart: CartResponse): CartItem[] {
  return cart.items.map((item) => ({
    id: item.id,
    product: {
      id: item.product_id,
      name: item.name,
        slug: item.slug ?? '',
      description: '',
      basePrice: toCartNumber(item.price),
      image: '',
      category: '',
      options: [],
    },
    quantity: item.quantity,
    choices: [],
    unitPrice: toCartNumber(item.price),
  }));
}
