import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

const mockOrders = [
  { id: "order-11055", customer_id: "customer-1", total_amount: 250000, status: "PENDING_PAYMENT", created_at: "2026-05-20T10:00:00Z", branch_id: "br-le-loi", delivery_mode: "delivery", items: [] },
  { id: "order-11051", customer_id: "customer-2", total_amount: 180000, status: "OUT_FOR_DELIVERY", created_at: "2026-05-19T09:00:00Z", branch_id: "br-pasteur", delivery_mode: "pickup", items: [] },
];

vi.mock("@repo/api-client", () => ({
  getOrders: vi.fn(() => Promise.resolve(mockOrders)),
  updateOrderStatus: vi.fn(() => Promise.resolve()),
}));

import OrdersPage from "./page";

afterEach(cleanup);

describe("OrdersPage", () => {
  it("renders the orders heading", async () => {
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /live orders/i })).toBeInTheDocument();
    });
  });

  it("shows order data in the columns", async () => {
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByText("#11055")).toBeInTheDocument();
      expect(screen.getByText("P. Ngọc")).toBeInTheDocument();
      expect(screen.getByText("#11051")).toBeInTheDocument();
      expect(screen.getByText("D. Linh")).toBeInTheDocument();
    });
  });

  it("renders column headers", async () => {
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByText("Queued")).toBeInTheDocument();
      expect(screen.getByText("In the kitchen")).toBeInTheDocument();
      expect(screen.getByText("Out for delivery")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });
});
