import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart';

const mockProduct = {
  id: 'p1',
  name: 'Croissant',
  slug: 'croissant',
  description: 'Buttery croissant',
  basePrice: 45000,
  image: '/img.jpg',
  category: 'pastry',
  options: [],
};

const makeItem = (overrides = {}) => ({
  product: mockProduct,
  quantity: 1,
  choices: [],
  unitPrice: 45000,
  ...overrides,
});

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], coupon: null, branchId: null });
  });

  it('addItem adds an item with generated id', () => {
    useCartStore.getState().addItem(makeItem());
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.name).toBe('Croissant');
    expect(items[0].id).toBeDefined();
  });

  it('removeItem removes by id', () => {
    useCartStore.getState().addItem(makeItem());
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clearCart empties items and coupon', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().applyCoupon({ code: 'TEST', description: '', discountType: 'fixed', discountValue: 5000 });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('subtotal sums unitPrice * quantity', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 45000, quantity: 2 }));
    useCartStore.getState().addItem(makeItem({ unitPrice: 30000, quantity: 1 }));
    expect(useCartStore.getState().subtotal()).toBe(120000);
  });

  it('total returns subtotal minus discount', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 100000, quantity: 1 }));
    useCartStore.getState().applyCoupon({ code: 'OFF10', description: '', discountType: 'percent', discountValue: 10 });
    expect(useCartStore.getState().total()).toBe(90000);
  });

  it('discount respects minOrder', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 10000, quantity: 1 }));
    useCartStore.getState().applyCoupon({ code: 'BIG', description: '', discountType: 'fixed', discountValue: 5000, minOrder: 50000 });
    expect(useCartStore.getState().discount()).toBe(0);
  });

  it('discount respects maxDiscount', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 200000, quantity: 1 }));
    useCartStore.getState().applyCoupon({ code: 'CAP', description: '', discountType: 'percent', discountValue: 50, maxDiscount: 20000 });
    expect(useCartStore.getState().discount()).toBe(20000);
  });

  it('updateQuantity changes quantity', () => {
    useCartStore.getState().addItem(makeItem());
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().updateQuantity(id, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('updateQuantity removes item when qty <= 0', () => {
    useCartStore.getState().addItem(makeItem());
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().updateQuantity(id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
