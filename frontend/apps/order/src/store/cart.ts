import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Coupon } from '@/types';

export interface SelectedBranch {
  id: string;
  name: string;
  address: string;
  dist: string;
  eta: string;
}

interface CartStore {
  branchId: string | null;
  selectedBranch: SelectedBranch | null;
  items: CartItem[];
  coupon: Coupon | null;
  isCartOpen: boolean;
  setBranch: (id: string) => void;
  selectBranch: (branch: SelectedBranch) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      branchId: null,
      selectedBranch: null,
      items: [],
      coupon: null,
      isCartOpen: false,

      // Reorder flow only knows the id; drop any stale summary so the menu
      // header falls back gracefully instead of showing the wrong branch.
      setBranch: (id) => set({ branchId: id, selectedBranch: null, items: [], coupon: null }),

      selectBranch: (branch) =>
        set({ branchId: branch.id, selectedBranch: branch, items: [], coupon: null }),

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: crypto.randomUUID() }],
          isCartOpen: true,
        })),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, qty) =>
        set((state) => ({
          items: qty <= 0
            ? state.items.filter((i) => i.id !== id)
            : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        })),

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
      clearCart: () => set({ items: [], coupon: null }),
      setCartOpen: (open) => set({ isCartOpen: open }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

      discount: () => {
        const { coupon } = get();
        if (!coupon) return 0;
        const sub = get().subtotal();
        if (coupon.minOrder && sub < coupon.minOrder) return 0;
        if (coupon.discountType === 'fixed') return coupon.discountValue;
        const raw = (sub * coupon.discountValue) / 100;
        return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
      },

      total: () => Math.max(0, get().subtotal() - get().discount()),
    }),
    { name: 'bakerio-cart' }
  )
);
