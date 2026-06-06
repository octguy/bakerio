import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";

const dashboardStats = vi.hoisted(() => ({
  totalOrders: 31,
  revenue: 27_500_000,
  activeProducts: 9,
  lowStockItems: 3,
}));

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

vi.mock("@repo/api-client/mock/analytics", () => ({
  getMockDashboardStats: vi.fn(() => dashboardStats),
  getMockDailyRevenue: vi.fn(() => [
    { date: "Mon", revenue: 1_000_000, orders: 4 },
    { date: "Tue", revenue: 2_000_000, orders: 5 },
  ]),
  getMockRecentOrders: vi.fn(() => [
    { id: "ORD-1", customer: "Mai", total: 125_000 },
  ]),
  getMockHeatmap: vi.fn(() => ({
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    hours: Array.from({ length: 14 }, (_, index) => index + 7),
    grid: Array.from({ length: 7 }, () => Array.from({ length: 14 }, () => 0.25)),
    peak: { day: "MON", hour: 9, ordersPerHour: 12 },
  })),
  getMockAlerts: vi.fn(() => [
    { tag: "STOCK", branch: "Lê Lợi", text: "Flour low", sev: "red", time: "2m" },
    { tag: "ORDER", branch: "Pasteur", text: "Order delayed", sev: "amber", time: "8m" },
  ]),
  getMockTopSellers: vi.fn(() => [
    { rank: "01", name: "Bánh mì", sold: 12, rev: 780_000, share: 80 },
  ]),
}));

import DashboardPage from "./page";

afterEach(cleanup);

describe("DashboardPage", () => {
  it("renders the dashboard heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /good morning, baker/i })).toBeInTheDocument();
  });

  it("displays stat cards with correct values", () => {
    render(<DashboardPage />);
    // Assert compact VND formatting from formatCompactVnd
    expect(screen.getByText("27.5M₫")).toBeInTheDocument();
    expect(screen.getByText("887K₫")).toBeInTheDocument();
  });

  it("renders stat cards in a grid layout", () => {
    const { container } = render(<DashboardPage />);
    const grid = container.querySelector(".grid.grid-cols-1.gap-3.sm\\:grid-cols-2.lg\\:grid-cols-4");
    expect(grid).toBeInTheDocument();
    const cards = grid!.children;
    expect(cards).toHaveLength(4);
  });

  it("shows active product count from query data", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/2 loaves so far/i)).toBeInTheDocument();
  });

  it("falls back to stats value when products are loading", () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<DashboardPage />);
    expect(screen.getByText(/9 loaves so far/i)).toBeInTheDocument();
  });
});
