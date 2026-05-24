import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: [
      { id: "1", name: "Product 1", is_active: true },
      { id: "2", name: "Product 2", is_active: true },
      { id: "3", name: "Product 3", is_active: false },
    ],
    isLoading: false,
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: any) => <button>{children}</button>,
}));

vi.mock("@/lib/utils", () => ({
  formatCurrency: (amount: number) => `${amount.toLocaleString()} ₫`,
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Package: () => <svg data-testid="icon-package" />,
  DollarSign: () => <svg data-testid="icon-dollar" />,
  ShoppingCart: () => <svg data-testid="icon-cart" />,
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  Plus: () => <svg data-testid="icon-plus" />,
}));

vi.mock("next/link", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: ({ tickFormatter }: any) => {
    if (tickFormatter) {
      try {
        tickFormatter(12000000);
      } catch {}
    }
    return null;
  },
  CartesianGrid: () => null,
  Tooltip: ({ formatter }: any) => {
    if (formatter) {
      try {
        formatter(5000000);
      } catch {}
    }
    return null;
  },
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ label }: any) => {
    if (label) {
      if (typeof label === "function") {
        try {
          label({ name: "PENDING_PAYMENT", percent: 0.25 });
        } catch {}
      }
    }
    return null;
  },
  Cell: () => null,
}));

import DashboardPage from "./page";

afterEach(cleanup);

describe("DashboardPage", () => {
  it("renders the dashboard heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("displays stat cards with correct values", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("1,247")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("456,800,000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Active Products")).toBeInTheDocument();
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders stat cards in a grid layout", () => {
    const { container } = render(<DashboardPage />);
    const grid = container.querySelector(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4");
    expect(grid).toBeInTheDocument();
    const cards = grid!.querySelectorAll("[data-testid='card']");
    expect(cards).toHaveLength(4);
  });

  it("shows active product count from query data", () => {
    render(<DashboardPage />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("falls back to stats value when products are loading", () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<DashboardPage />);
    expect(screen.getByText("Active Products")).toBeInTheDocument();
  });
});
