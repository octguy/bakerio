
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Coupon } from '@/types';
import { getCart, addCartItem, updateCartItem, removeCartItem, clearCart as apiClearCart, type CartResponse } from '@repo/api-client';
import { cartResponseToItems } from './cart-adapter';

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
  // flags & errors
  syncing: boolean;
  cartError: string | null;
  backendReady: boolean;
  authed: boolean;
  cartIsGuest: boolean;
  // hydration
  mergeAndHydrate: () => void;
  // core state
  branchId: string | null;
  selectedBranch: SelectedBranch | null;
  items: CartItem[];
  coupon: Coupon | null;
  isCartOpen: boolean;
  undoSnapshot: CartSnapshot | null;
  // actions
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
  setAuthed: (authed: boolean) => void;
  resetForSignedOut: () => void;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      // ----- Helpers -----
      const isAuthed = () => get().authed;
      const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Cart sync failed');
      const applyRemoteCart = (cart: CartResponse) => ({
        items: cartResponseToItems(cart),
        syncing: false,
        cartError: null,
        backendReady: true,
        cartIsGuest: false,
      });
      const mutatingSet = (
        updater: Partial<CartStore> | ((state: CartStore) => Partial<CartStore>),
        skipUndoClear = false,
      ) => {
        set((state) => {
          const updates = typeof updater === 'function' ? updater(state) : updater;
          return skipUndoClear ? updates : { ...updates, undoSnapshot: null };
        });
      };

      // ----- Core actions -----
      const mergeAndHydrate = () => {
        if (!isAuthed()) return;
        const { items, cartIsGuest } = get();
        mutatingSet({ syncing: true, cartError: null }, true);
        const guestItems = cartIsGuest ? items.filter((i) => i.product.id) : [];
        guestItems
          .reduce((chain, it) => chain.then(() => addCartItem(it.product.id, it.quantity).then(() => undefined)), Promise.resolve())
          .then(() => getCart())
          .then((cart) => mutatingSet({ ...applyRemoteCart(cart) }))
          .catch((e) =>
            getCart()
              .then((cart) => mutatingSet({ ...applyRemoteCart(cart), cartError: errorMessage(e) }))
              .catch(() => mutatingSet({ syncing: false, backendReady: false, cartError: errorMessage(e) })),
          );
      };

      const addItem = (item: Omit<CartItem, 'id'>) => {
               const snap = {
                 items: get().items,
                 coupon: get().coupon,
                 branchId: get().branchId,
                 selectedBranch: get().selectedBranch,
               };
                const optimisticId = crypto.randomUUID();
                mutatingSet((state) => ({
                  items: [...state.items, { ...item, id: optimisticId }],
                  isCartOpen: true,
                  ...(!isAuthed() ? { cartIsGuest: true } : {}),
                }));
               if (isAuthed()) {
                 mutatingSet({ syncing: true, cartError: null }, true);
                 addCartItem(item.product.id, item.quantity)
                   .then((remoteCart) => mutatingSet({ ...applyRemoteCart(remoteCart), isCartOpen: true }))
                   .catch((e) =>
                     mutatingSet({
                       items: snap.items,
                       coupon: snap.coupon,
                       branchId: snap.branchId,
                       selectedBranch: snap.selectedBranch,
                       cartError: errorMessage(e),
                       syncing: false,
                     }),
                   );
               }
      };

      const removeItem = (id: string) => {
        const previous = get().items;
        mutatingSet((state) => ({
          items: state.items.filter((i) => i.id !== id),
          ...(!isAuthed() ? { cartIsGuest: true } : {}),
        }));
        if (isAuthed()) {
          mutatingSet({ syncing: true, cartError: null }, true);
          removeCartItem(id)
            .then((remoteCart) => mutatingSet({ ...applyRemoteCart(remoteCart) }))
            .catch((e) => mutatingSet({ items: previous, cartError: errorMessage(e), syncing: false }));
        }
      };

      const updateQuantity = (id: string, qty: number) => {
        const previous = get().items;
        mutatingSet((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
          ...(!isAuthed() ? { cartIsGuest: true } : {}),
        }));
        if (isAuthed()) {
          mutatingSet({ syncing: true, cartError: null }, true);
          const apiCall = qty <= 0 ? removeCartItem(id) : updateCartItem(id, qty);
          apiCall
            .then((remoteCart) => mutatingSet({ ...applyRemoteCart(remoteCart) }))
            .catch((e) => mutatingSet({ items: previous, cartError: errorMessage(e), syncing: false }));
        }
      };

      const clearCart = (captureSnapshot = false) => {
        const snap = {
          items: get().items,
          coupon: get().coupon,
          branchId: get().branchId,
          selectedBranch: get().selectedBranch,
        };
        mutatingSet({
          undoSnapshot: captureSnapshot ? snap : null,
          items: [],
          coupon: null,
          ...(!isAuthed() ? { cartIsGuest: true } : {}),
        }, true);
        if (isAuthed()) {
          mutatingSet({ syncing: true, cartError: null }, true);
          apiClearCart()
            .then(() => mutatingSet({ syncing: false, backendReady: true, cartError: null, cartIsGuest: false }))
            .catch((e) =>
                mutatingSet({ items: snap.items, coupon: snap.coupon, branchId: snap.branchId, selectedBranch: snap.selectedBranch, cartError: errorMessage(e), syncing: false }),
            );
        }
      };

      const restoreCart = () =>
        mutatingSet((state) => {
          if (!state.undoSnapshot) return state;
          const s = state.undoSnapshot;
          return { items: s.items, coupon: s.coupon, branchId: s.branchId, selectedBranch: s.selectedBranch, undoSnapshot: null };
        }, true);

      const dismissUndo = () => mutatingSet({ undoSnapshot: null }, true);

      const setBranch = (id: string) =>
        mutatingSet({ branchId: id, selectedBranch: null, items: [], coupon: null });

      const selectBranch = (branch: SelectedBranch) =>
        mutatingSet({ branchId: branch.id, selectedBranch: branch, items: [], coupon: null });

      const applyCoupon = (c: Coupon) => mutatingSet({ coupon: c });
      const removeCoupon = () => mutatingSet({ coupon: null });
      const setCartOpen = (open: boolean) => mutatingSet({ isCartOpen: open }, true);
      const setAuthed = (authed: boolean) => mutatingSet({ authed }, true);
      const resetForSignedOut = () =>
        mutatingSet({
          items: [],
          coupon: null,
          branchId: null,
          selectedBranch: null,
          undoSnapshot: null,
          backendReady: false,
          cartError: null,
          syncing: false,
          cartIsGuest: true,
        }, true);

      const subtotal = () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const discount = () => {
        const { coupon } = get();
        if (!coupon) return 0;
        const sub = subtotal();
        if (coupon.minOrder && sub < coupon.minOrder) return 0;
        if (coupon.discountType === 'fixed') return coupon.discountValue;
        const raw = (sub * coupon.discountValue) / 100;
        return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
      };
      const total = () => Math.max(0, subtotal() - discount());

      return {
        // flags & errors
        syncing: false,
        cartError: null,
        backendReady: false,
        authed: false,
        cartIsGuest: true,
        // hydration
        mergeAndHydrate,
        // core state
        branchId: null,
        selectedBranch: null,
        items: [],
        coupon: null,
        isCartOpen: false,
        undoSnapshot: null,
        // actions
        setBranch,
        selectBranch,
        addItem,
        removeItem,
        updateQuantity,
        applyCoupon,
        removeCoupon,
        clearCart,
        restoreCart,
        dismissUndo,
        setCartOpen,
        setAuthed,
        resetForSignedOut,
        subtotal,
        discount,
        total,
      };
    },
    {
      name: 'bakerio-cart',
        partialize: (state) => {
          const transientKeys = new Set(['undoSnapshot','isCartOpen','syncing','cartError','backendReady','authed']);
          return Object.fromEntries(Object.entries(state).filter(([k]) => !transientKeys.has(k))) as Partial<CartStore>;
        },
    },
  ),
);
