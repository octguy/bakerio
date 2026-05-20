export interface ProductOption {
  id: string;
  name: string;
  choices: { id: string; label: string; priceAdjust: number }[];
}

export interface LocalProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  image: string;
  category: string;
  options: ProductOption[];
}

export interface CartItemChoice {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceLabel: string;
  priceAdjust: number;
}

export interface CartItem {
  id: string;
  product: LocalProduct;
  quantity: number;
  choices: CartItemChoice[];
  unitPrice: number;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrder?: number;
  maxDiscount?: number;
}
