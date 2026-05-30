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

interface CartSnapshot {
  branchId: string | null;
  selectedBranch: SelectedBranch | null;
  items: CartItem[];
  coupon: Coupon | null;
}

interface CartStore {
  branchId: string | null;
  selectedBranch: SelectedBranch | null;
  items: CartItem[];
  coupon: Coupon | null;
  isCartOpen: boolean;
  undoSnapshot: CartSnapshot | null;
  setBranch: (id: string) => void;
  selectBranch: (branch: SelectedBranch) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  clearCart: (captureSnapshot?: boolean) => void;
  restoreCart: () => void;
  dismissUndo: () => void;
  setCartOpen: (open: boolean) => void;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      // Wrapper to automatically clear undoSnapshot on any state change,
      // except when explicitly instructed by clearCart, restoreCart, or dismissUndo.
      const mutatingSet = (
        updater: Partial<CartStore> | ((state: CartStore) => Partial<CartStore>),
        skipUndoClear = false
      ) => {
        set((state) => {
          const updates = typeof updater === 'function' ? updater(state) : updater;
          if (skipUndoClear) {
            return updates;
          }
          return { ...updates, undoSnapshot: null };
        });
      };

      return {
        branchId: null,
        selectedBranch: null,
        items: [],
        coupon: null,
        isCartOpen: false,
        undoSnapshot: null,

        setBranch: (id) => mutatingSet({ branchId: id, selectedBranch: null, items: [], coupon: null }),

        selectBranch: (branch) =>
          mutatingSet({ branchId: branch.id, selectedBranch: branch, items: [], coupon: null }),

        addItem: (item) =>
          mutatingSet((state) => ({
            items: [...state.items, { ...item, id: crypto.randomUUID() }],
            isCartOpen: true,
          })),

        removeItem: (id) =>
          mutatingSet((state) => ({ items: state.items.filter((i) => i.id !== id) })),

        updateQuantity: (id, qty) =>
          mutatingSet((state) => ({
            items: qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
          })),

        applyCoupon: (coupon) => mutatingSet({ coupon }),
        removeCoupon: () => mutatingSet({ coupon: null }),
        clearCart: (captureSnapshot = false) => mutatingSet((state) => ({ 
          undoSnapshot: captureSnapshot 
            ? { items: state.items, coupon: state.coupon, branchId: state.branchId, selectedBranch: state.selectedBranch } 
            : null,
          items: [], 
          coupon: null 
        }), true),
        restoreCart: () => mutatingSet((state) => {
          if (!state.undoSnapshot) return state;
          const snapshot = state.undoSnapshot;
          return {
            items: snapshot.items,
            coupon: snapshot.coupon,
            branchId: snapshot.branchId,
            selectedBranch: snapshot.selectedBranch,
            undoSnapshot: null
          };
        }, true),
        dismissUndo: () => mutatingSet({ undoSnapshot: null }, true),
        setCartOpen: (open) => mutatingSet({ isCartOpen: open }, true), // UI state doesn't clear undo

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
      };
    },
    { 
      name: 'bakerio-cart',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => key !== 'undoSnapshot' && key !== 'isCartOpen')
      ) as CartStore
    }
  )
);
