import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/cart",
}));

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) => `${amount.toLocaleString("vi-VN")}₫`,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@repo/api-client/mock/loyalty", () => ({
  maxRedeemableFor: vi.fn().mockResolvedValue(10000),
}));

const mockItems = [
  {
    id: "1",
    product: { id: "p1", name: "Bánh Mì" },
    quantity: 2,
    choices: [{ optionId: "o1", optionName: "Size", choiceId: "c1", choiceLabel: "Lớn", priceAdjust: 0 }],
    unitPrice: 25000,
  },
];

const mockRemoveItem = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockSubtotal = vi.fn(() => 50000);

vi.mock("@/store/cart", () => ({
  useCartStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      items: mockItems,
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
      subtotal: mockSubtotal,
    };
    return selector(state);
  }),
}));

import { maxRedeemableFor } from "@repo/api-client/mock/loyalty";
import { useCartStore } from "@/store/cart";
import CartPage from "./page";

function mockFilledCartStore() {
  vi.mocked(useCartStore).mockImplementation((selector: (s: unknown) => unknown) => {
    const state = {
      items: mockItems,
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
      subtotal: mockSubtotal,
    };
    return selector(state);
  });
}

beforeEach(() => {
  mockFilledCartStore();
  vi.mocked(maxRedeemableFor).mockResolvedValue(10000);
  mockRemoveItem.mockClear();
  mockUpdateQuantity.mockClear();
  mockSubtotal.mockClear();
});

afterEach(cleanup);

describe("CartPage", () => {
  it("renders without crashing", () => {
    render(<CartPage />);
    expect(screen.getByText("Your basket")).toBeDefined();
  });

  it("shows cart items with names and quantities", () => {
    render(<CartPage />);
    expect(screen.getByText("Bánh Mì")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows total price formatted as VND", async () => {
    render(<CartPage />);
    expect(await screen.findByText("40.000₫")).toBeInTheDocument();
  });

  it("has a checkout link", async () => {
    render(<CartPage />);
    const link = await screen.findByRole("link", { name: /Pay 40\.000₫/i });
    expect(link.getAttribute("href")).toBe("/checkout");
  });

  it("calls removeItem when Clear button clicked", () => {
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(mockRemoveItem).toHaveBeenCalledWith("1");
  });

  it("calls updateQuantity with incremented value when + clicked", () => {
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(mockUpdateQuantity).toHaveBeenCalledWith("1", 3);
  });

  it("calls updateQuantity with decremented value when − clicked", () => {
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(mockUpdateQuantity).toHaveBeenCalledWith("1", 1);
  });

  it("displays the correct loyalty discount total dynamically", async () => {
    render(<CartPage />);
    expect(await screen.findByText("−10.000₫")).toBeInTheDocument();
  });

  it("falls back to no loyalty discount when the loyalty calculation fails", async () => {
    vi.mocked(maxRedeemableFor).mockRejectedValueOnce(new Error("offline"));

    render(<CartPage />);

    await waitFor(() => {
      expect(maxRedeemableFor).toHaveBeenCalledWith(50000);
    });
    expect(screen.getByRole("link", { name: /Pay 50\.000₫/i }).getAttribute("href")).toBe("/checkout");
  });

  it("shows empty cart message and menu link when cart is empty", async () => {
    vi.mocked(useCartStore).mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        items: [],
        removeItem: mockRemoveItem,
        updateQuantity: mockUpdateQuantity,
        subtotal: vi.fn(() => 0),
      };
      return selector(state);
    });

    render(<CartPage />);
    expect(screen.getByText(/Nothing in the basket/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /browse menu/i }).getAttribute("href")).toBe("/menu");
  });
});
