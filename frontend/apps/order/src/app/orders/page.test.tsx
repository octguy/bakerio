import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockAddItem = vi.fn();
const mockSetBranch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@repo/api-client", () => ({
  getMockOrderSessionUser: vi.fn().mockReturnValue("user-1"),
  getOrders: vi.fn().mockResolvedValue([
    {
      id: "order-1",
      branch_id: "br-le-loi",
      status: "COMPLETED",
      total_amount: 75000,
      created_at: "2024-01-01T00:00:00Z",
      items: [{ id: "i1", product_id: "p-bmi-1", product_name: "Bread", quantity: 3, total_price: 75000 }],
    },
  ]),
  getOrderStats: vi.fn().mockResolvedValue({
    lifetime: 1,
    inProgress: 0,
    delivered: 1,
    cancelled: 0,
  }),
  getProduct: vi.fn().mockResolvedValue({
    id: "p-bmi-1",
    name: "Bread",
    slug: "bread",
    description: "",
    base_price: 25000,
    category: { name: "Loaves" },
    images: [{ url: "/bread.jpg" }],
  }),
  reorderItems: vi.fn().mockResolvedValue([{ product_id: "p-bmi-1", quantity: 3 }]),
}));

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) => `${amount.toLocaleString()} ₫`,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/store/cart", () => ({
  useCartStore: vi.fn((selector: any) =>
    selector({
      addItem: mockAddItem,
      setBranch: mockSetBranch,
    })),
}));

import OrdersPage from "./page";

afterEach(cleanup);

beforeEach(() => {
  mockPush.mockClear();
  mockAddItem.mockClear();
  mockSetBranch.mockClear();
});

describe("OrdersPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<OrdersPage />);
    expect(container).toBeTruthy();
  });

  it("shows orders heading", () => {
    render(<OrdersPage />);
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("displays loading state initially", () => {
    render(<OrdersPage />);
    expect(screen.getByText("Reading the order book…")).toBeInTheDocument();
  });

  it("displays order status and total after load", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("Picked up")).toBeInTheDocument();
    expect(await screen.findByText(/75,000/)).toBeInTheDocument();
  });

  it("displays order item info after load", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText(/3 items/)).toBeInTheDocument();
  });

  it("shows empty state when no orders", async () => {
    const { getOrders } = await import("@repo/api-client");
    vi.mocked(getOrders).mockResolvedValueOnce([]);
    render(<OrdersPage />);
    expect(await screen.findByText("No orders to show.")).toBeInTheDocument();
  });

  it("restores the source branch before re-adding reordered items", async () => {
    render(<OrdersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Reorder" }));

    await waitFor(() => {
      expect(mockSetBranch).toHaveBeenCalledWith("br-le-loi");
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 3,
          unitPrice: 25000,
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/cart");
    });

    expect(mockSetBranch.mock.invocationCallOrder[0]).toBeLessThan(mockAddItem.mock.invocationCallOrder[0]);
  });
});
