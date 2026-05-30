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
    useCartStore.setState({ items: [], coupon: null, branchId: null, undoSnapshot: null, selectedBranch: null, isCartOpen: false });
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

  it('total clamps to 0 if discount exceeds subtotal', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 10000, quantity: 1 }));
    useCartStore.getState().applyCoupon({ code: 'HUGE_DISCOUNT', description: '', discountType: 'fixed', discountValue: 20000 });
    expect(useCartStore.getState().total()).toBe(0);
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

  it('updateQuantity changes quantity and leaves non-matching items intact', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().addItem(makeItem());
    const items = useCartStore.getState().items;
    const id1 = items[0].id;
    const id2 = items[1].id;
    useCartStore.getState().updateQuantity(id1, 5);
    expect(useCartStore.getState().items.find(i => i.id === id1)!.quantity).toBe(5);
    expect(useCartStore.getState().items.find(i => i.id === id2)!.quantity).toBe(1);
  });

  it('updateQuantity removes item when qty <= 0', () => {
    useCartStore.getState().addItem(makeItem());
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().updateQuantity(id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('setBranch sets branchId and clears items and coupon', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().applyCoupon({ code: 'TEST', description: '', discountType: 'fixed', discountValue: 5000 });
    useCartStore.getState().setBranch('br-saigon');
    expect(useCartStore.getState().branchId).toBe('br-saigon');
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('selectBranch sets selectedBranch', () => {
    useCartStore.getState().selectBranch('br-hanoi');
    expect(useCartStore.getState().selectedBranch).toBe('br-hanoi');
  });

  it('setCartOpen toggles cart visibility state', () => {
    expect(useCartStore.getState().isCartOpen).toBe(false);
    useCartStore.getState().setCartOpen(true);
    expect(useCartStore.getState().isCartOpen).toBe(true);
    useCartStore.getState().setCartOpen(false);
    expect(useCartStore.getState().isCartOpen).toBe(false);
  });

  it('removeCoupon clears only the coupon', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().applyCoupon({ code: 'TEST', description: '', discountType: 'fixed', discountValue: 5000 });
    useCartStore.getState().removeCoupon();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('discount calculates percentage correctly without max limit', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 100000, quantity: 1 }));
    useCartStore.getState().applyCoupon({ code: 'OFF15', description: '', discountType: 'percent', discountValue: 15 });
    expect(useCartStore.getState().discount()).toBe(15000);
  });

  it('discount applies fixed coupon correctly', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 20000, quantity: 1 }));
    useCartStore.getState().applyCoupon({ code: 'FIX5', description: '', discountType: 'fixed', discountValue: 5000 });
    expect(useCartStore.getState().discount()).toBe(5000);
  });

  it('discount applies coupon when subtotal meets minOrder limit', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 30000, quantity: 2 }));
    useCartStore.getState().applyCoupon({ code: 'BIG', description: '', discountType: 'fixed', discountValue: 10000, minOrder: 50000 });
    expect(useCartStore.getState().discount()).toBe(10000);
  });

  it('discount returns 0 if no coupon is active', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 50000, quantity: 1 }));
    expect(useCartStore.getState().discount()).toBe(0);
  });
});

describe('cart store undo snapshot invariants', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      undoSnapshot: null,
      branchId: null,
      selectedBranch: null,
      coupon: null,
      isCartOpen: false
    });
  });

  it('clearCart(true) creates snapshot and empties cart', () => {
    useCartStore.getState().addItem(makeItem());
    expect(useCartStore.getState().items.length).toBe(1);

    useCartStore.getState().clearCart(true);
    const state = useCartStore.getState();
    expect(state.items.length).toBe(0);
    expect(state.undoSnapshot).toBeTruthy();
    expect(state.undoSnapshot?.items.length).toBe(1);
  });

  it('restoreCart successfully atomic restores snapshot and sets it to null', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().clearCart(true);
    expect(useCartStore.getState().undoSnapshot).toBeTruthy();

    useCartStore.getState().restoreCart();
    const state = useCartStore.getState();
    expect(state.undoSnapshot).toBeNull();
    expect(state.items.length).toBe(1);
  });

  it('subsequent mutations clear the snapshot reliably', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().clearCart(true);
    expect(useCartStore.getState().undoSnapshot).toBeTruthy();

    useCartStore.getState().addItem(makeItem());
    expect(useCartStore.getState().undoSnapshot).toBeNull();
  });

  it('dismissUndo clears the undoSnapshot explicitly', () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().clearCart(true);
    expect(useCartStore.getState().undoSnapshot).toBeTruthy();

    useCartStore.getState().dismissUndo();
    expect(useCartStore.getState().undoSnapshot).toBeNull();
  });

  it('partialize excludes undoSnapshot and isCartOpen', () => {
    const partialize = useCartStore.persist.getOptions().partialize!;
    const mockState = {
      undoSnapshot: { items: [] },
      isCartOpen: true,
      items: [{ id: '1' }],
      branchId: 'b1'
    };
    const result = partialize(mockState as any);
    expect(result.undoSnapshot).toBeUndefined();
    expect(result.isCartOpen).toBeUndefined();
    expect(result.items).toBeDefined();
    expect(result.branchId).toBe('b1');
  });
});