import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";

vi.mock("@repo/api-client", () => ({
  getOrders: vi.fn().mockResolvedValue([
    {
      id: "order-1",
      status: "COMPLETED",
      total_amount: 75000,
      created_at: "2024-01-01T00:00:00Z",
      items: [{ id: "i1", product_name: "Bread", quantity: 3 }],
    },
  ]),
}));

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) => `${amount.toLocaleString()} ₫`,
}));

import OrdersPage from "./page";

afterEach(cleanup);

describe("OrdersPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<OrdersPage />);
    expect(container).toBeTruthy();
  });

  it("shows orders heading", () => {
    render(<OrdersPage />);
    expect(screen.getByText("My Orders")).toBeInTheDocument();
  });

  it("displays loading state initially", () => {
    render(<OrdersPage />);
    expect(screen.getByText("Loading orders...")).toBeInTheDocument();
  });

  it("displays order status and total after load", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("COMPLETED")).toBeInTheDocument();
    expect(await screen.findByText("75,000 ₫")).toBeInTheDocument();
  });

  it("displays order item info after load", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("Bread × 3")).toBeInTheDocument();
  });

  it("shows empty state when no orders", async () => {
    const { getOrders } = await import("@repo/api-client");
    vi.mocked(getOrders).mockResolvedValueOnce([]);
    render(<OrdersPage />);
    expect(await screen.findByText("No orders yet")).toBeInTheDocument();
  });
});
