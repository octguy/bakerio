import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderFulfillmentMode, OrderItem } from "@repo/api-client";

export interface RichOrderDetail {
  fulfillment_mode: OrderFulfillmentMode;
  delivery_address?: string;
  requested_time: string;
  payment_method: string;
  delivery_fee_amount: number;
  loyalty_discount_amount: number;
  crumbs_redeemed?: number;
  subtotal_amount: number;
  total_amount: number;
  note?: string;
  items: OrderItem[];
}

interface OrderDetailsStore {
  // Map of userId -> orderId -> RichOrderDetail
  orders: Record<string, Record<string, RichOrderDetail>>;
  saveOrderDetail: (userId: string | null, orderId: string, details: RichOrderDetail) => void;
  getOrderDetail: (userId: string | null, orderId: string) => RichOrderDetail | undefined;
  clearAll: () => void;
}

export const useOrderDetailsStore = create<OrderDetailsStore>()(
  persist(
    (set, get) => ({
      orders: {},

      saveOrderDetail: (userId, orderId, details) =>
        set((state) => {
          const userKey = userId || "guest";
          const userOrders = state.orders[userKey] || {};
          return {
            orders: {
              ...state.orders,
              [userKey]: {
                ...userOrders,
                [orderId]: details,
              },
            },
          };
        }),

      getOrderDetail: (userId, orderId) => {
        const userKey = userId || "guest";
        return get().orders[userKey]?.[orderId];
      },

      clearAll: () => set({ orders: {} }),
    }),
    { name: "bakerio-order-details" }
  )
);
