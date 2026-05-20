import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@repo/api-client", () => ({}));

vi.mock("@repo/api-client/mock/analytics", () => ({
  getMockRecentOrders: () => [
    { id: "ORD-1001", customer: "Nguyễn Văn A", total: 250000, status: "PENDING_PAYMENT", date: "2026-05-20T10:00:00Z" },
    { id: "ORD-1002", customer: "Trần Thị B", total: 180000, status: "DELIVERED", date: "2026-05-19T09:00:00Z" },
  ],
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({ data }: any) => (
    <table>
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.customer}</td>
            <td>{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}));

vi.mock("@/lib/utils", () => ({
  formatCurrency: (n: number) => `${n} ₫`,
}));

vi.mock("lucide-react", () => ({}));

import OrdersPage from "./page";

afterEach(cleanup);

describe("OrdersPage", () => {
  it("renders the orders heading", () => {
    render(<OrdersPage />);
    expect(screen.getByRole("heading", { name: /orders/i })).toBeInTheDocument();
  });

  it("shows order data in the table", () => {
    render(<OrdersPage />);
    expect(screen.getByText("ORD-1001")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
  });

  it("has a status filter select with all status options", () => {
    render(<OrdersPage />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("All Statuses")).toBeInTheDocument();
    expect(screen.getByText("Pending Payment")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("filters orders when status filter changes to DELIVERED", () => {
    render(<OrdersPage />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "DELIVERED" } });
    expect(screen.getByText("ORD-1002")).toBeInTheDocument();
    expect(screen.queryByText("ORD-1001")).not.toBeInTheDocument();
  });

  it("shows all orders when filter is set to ALL", () => {
    render(<OrdersPage />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "CANCELLED" } });
    fireEvent.change(select, { target: { value: "ALL" } });
    expect(screen.getByText("ORD-1001")).toBeInTheDocument();
    expect(screen.getByText("ORD-1002")).toBeInTheDocument();
  });
});
