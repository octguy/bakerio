import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));
vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("@repo/api-client", () => ({ createOrder: vi.fn() }));
vi.mock("@repo/api-client/mock/loyalty", () => ({
  getLoyalty: vi.fn().mockResolvedValue({ balance: 1420 }),
  maxRedeemableFor: vi.fn().mockResolvedValue(10000),
  redeemCrumbs: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/format", () => ({ formatVND: (n: number) => `${n.toLocaleString("vi-VN")}₫` }));
vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockItems = [
  { id: "1", product: { id: "p1", name: "Bánh Mì" }, unitPrice: 25000, quantity: 2, choices: [] },
];
const mockClearCart = vi.fn();

vi.mock("@/store/cart", () => ({
  useCartStore: vi.fn((selector: any) => {
    const state = {
      items: mockItems,
      branchId: "b1",
      subtotal: () => 50000,
      clearCart: mockClearCart,
    };
    return selector(state);
  }),
}));

afterEach(cleanup);

import CheckoutPage from "./page";

beforeEach(async () => {
  mockClearCart.mockClear();
  mockReplace.mockClear();
  const { useCartStore } = await import("@/store/cart");
  vi.mocked(useCartStore).mockImplementation((selector: any) => {
    const state = {
      items: mockItems,
      branchId: "b1",
      subtotal: () => 50000,
      clearCart: mockClearCart,
    };
    return selector(state);
  });
});

describe("CheckoutPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<CheckoutPage />);
    expect(container).toBeTruthy();
  });

  it("has a place order button", () => {
    render(<CheckoutPage />);
    expect(screen.getByRole("button", { name: /Pay with Pay at counter/i })).toBeInTheDocument();
  });

  it("shows validation error when branchId is missing", async () => {
    const { useCartStore } = await import("@/store/cart");
    vi.mocked(useCartStore).mockImplementation((selector: any) => {
      const state = {
        items: mockItems,
        branchId: "",
        subtotal: () => 50000,
        clearCart: mockClearCart,
      };
      return selector(state);
    });

    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pay with Pay at counter/i }));

    expect(await screen.findByText("No branch selected")).toBeInTheDocument();
  });

  it("calls createOrder with correct payload on successful submission", async () => {
    const { useCartStore } = await import("@/store/cart");
    vi.mocked(useCartStore).mockImplementation((selector: any) => {
      const state = { items: mockItems, branchId: "b1", subtotal: () => 50000, clearCart: mockClearCart };
      return selector(state);
    });
    const { createOrder } = await import("@repo/api-client");
    vi.mocked(createOrder).mockResolvedValueOnce({} as any);

    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pay with Pay at counter/i }));

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(
        [{ product_id: "p1", quantity: 2 }],
        "b1",
        undefined
      );
    });
  });

  it("clears cart and shows success after order placed", async () => {
    const { useCartStore } = await import("@/store/cart");
    vi.mocked(useCartStore).mockImplementation((selector: any) => {
      const state = { items: mockItems, branchId: "b1", subtotal: () => 50000, clearCart: mockClearCart };
      return selector(state);
    });
    const { createOrder } = await import("@repo/api-client");
    vi.mocked(createOrder).mockResolvedValueOnce({} as any);

    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pay with Pay at counter/i }));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
    expect(screen.getByText(/Order placed/i)).toBeInTheDocument();
  });

  it("shows error message and does not clear cart when API fails", async () => {
    const { useCartStore } = await import("@/store/cart");
    vi.mocked(useCartStore).mockImplementation((selector: any) => {
      const state = { items: mockItems, branchId: "b1", subtotal: () => 50000, clearCart: mockClearCart };
      return selector(state);
    });
    const { createOrder } = await import("@repo/api-client");
    vi.mocked(createOrder).mockRejectedValueOnce(new Error("Network error"));

    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pay with Pay at counter/i }));

    expect(await screen.findByText("Failed to place order. Please try again.")).toBeInTheDocument();
    expect(mockClearCart).not.toHaveBeenCalled();
  });

  it("redirects to menu when cart is empty", async () => {
    const { useCartStore } = await import("@/store/cart");
    vi.mocked(useCartStore).mockImplementation((selector: any) => {
      const state = { items: [], branchId: "b1", subtotal: () => 0, clearCart: mockClearCart };
      return selector(state);
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/menu");
    });
  });

  it("displays the correct checkout total price formatted as VND", async () => {
    render(<CheckoutPage />);
    expect(await screen.findByText("40.000₫")).toBeInTheDocument();
  });
});
