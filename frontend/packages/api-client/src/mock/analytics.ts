// Mock analytics data for the admin Counter dashboard.
// Audit §III Counter: heatmap, branch leaderboard, alerts and top-sellers
// added so the dashboard isn't pulling from hard-coded arrays.

export interface DashboardStats {
  totalOrders: number;
  revenue: number;
  activeProducts: number;
  lowStockItems: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface HeatmapWeek {
  days: string[];
  hours: number[];
  /** [day][hour] grid of 0..1 normalised density values. */
  grid: number[][];
  peak: { day: string; hour: number; ordersPerHour: number };
}

export interface BranchRevenueRow {
  name: string;
  /** Revenue in millions of VND. */
  rev: number;
  /** 0..1 — share of leader. */
  share: number;
  trend: "up" | "down" | "flat";
}

export type AlertSeverity = "red" | "amber" | "green";

export interface LiveAlert {
  tag: "STOCK" | "ORDER" | "SHIFT" | "PROC.";
  branch: string;
  text: string;
  sev: AlertSeverity;
  time: string;
}

export interface TopSellerRow {
  rank: string;
  name: string;
  sold: number;
  rev: number;
  share: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i);

export function getMockDashboardStats(): DashboardStats {
  return { totalOrders: 1247, revenue: 456_800_000, activeProducts: 42, lowStockItems: 7 };
}

export function getMockDailyRevenue(): DailyRevenue[] {
  return [
    { date: "Mon", revenue: 12_500_000, orders: 34 },
    { date: "Tue", revenue: 15_200_000, orders: 41 },
    { date: "Wed", revenue: 11_800_000, orders: 29 },
    { date: "Thu", revenue: 18_400_000, orders: 52 },
    { date: "Fri", revenue: 22_100_000, orders: 63 },
    { date: "Sat", revenue: 28_600_000, orders: 78 },
    { date: "Sun", revenue: 24_300_000, orders: 67 },
  ];
}

export function getMockOrdersByStatus(): OrdersByStatus[] {
  return [
    { status: "Pending", count: 23 },
    { status: "Confirmed", count: 45 },
    { status: "Preparing", count: 18 },
    { status: "Delivered", count: 312 },
    { status: "Cancelled", count: 8 },
  ];
}

export function getMockRecentOrders() {
  return [
    { id: "ORD-1001", customer: "Nguyễn Văn A", total: 385_000, status: "CONFIRMED" as const, date: "2026-05-20T09:15:00Z" },
    { id: "ORD-1002", customer: "Trần Thị B",   total: 128_000, status: "PREPARING" as const, date: "2026-05-20T08:42:00Z" },
    { id: "ORD-1003", customer: "Lê Văn C",     total: 562_000, status: "DELIVERED" as const, date: "2026-05-20T07:30:00Z" },
    { id: "ORD-1004", customer: "Phạm Thị D",   total: 245_000, status: "PENDING_PAYMENT" as const, date: "2026-05-19T22:10:00Z" },
    { id: "ORD-1005", customer: "Hoàng Văn E",  total: 890_000, status: "COMPLETED" as const, date: "2026-05-19T20:45:00Z" },
  ];
}

export function getMockHeatmap(): HeatmapWeek {
  const dayBoost = [0.9, 0.95, 1.05, 1.0, 1.15, 1.25, 1.1];
  const grid = DAYS.map((_, day) =>
    HOURS.map((_, hr) => {
      const base = Math.sin((hr / HOURS.length) * Math.PI) * 0.7 + 0.2;
      const noise = Math.sin(day * 7 + hr) * 0.06;
      return Math.min(0.99, Math.max(0.05, base * (dayBoost[day] ?? 1) + noise));
    }),
  );
  return {
    days: DAYS,
    hours: HOURS,
    grid,
    peak: { day: "SAT", hour: 11, ordersPerHour: 64 },
  };
}

export function getMockBranchLeaderboard(): BranchRevenueRow[] {
  return [
    { name: "Lê Lợi",      rev: 4.8, share: 1.0,  trend: "up" },
    { name: "Pasteur",     rev: 3.2, share: 0.66, trend: "up" },
    { name: "Thảo Điền",   rev: 2.5, share: 0.52, trend: "flat" },
    { name: "Phú Mỹ Hưng", rev: 1.9, share: 0.40, trend: "down" },
    { name: "Bình Thạnh",  rev: 1.6, share: 0.33, trend: "up" },
    { name: "Phú Nhuận",   rev: 0.6, share: 0.13, trend: "flat" },
  ];
}

export function getMockAlerts(): LiveAlert[] {
  return [
    { tag: "STOCK", branch: "Lê Lợi",      text: "Bột mì T55 — 4kg left",         sev: "red",   time: "3m" },
    { tag: "ORDER", branch: "Pasteur",     text: "#11042 stalled — kitchen 18m",  sev: "red",   time: "5m" },
    { tag: "SHIFT", branch: "Thảo Điền",   text: "Closing baker not clocked in",  sev: "amber", time: "12m" },
    { tag: "PROC.", branch: "Central",     text: "PO-2911 delivered · approve",   sev: "green", time: "18m" },
    { tag: "STOCK", branch: "Phú Mỹ Hưng", text: "Bơ AOP — 1.2kg below par",      sev: "amber", time: "32m" },
  ];
}

export function getMockTopSellers(): TopSellerRow[] {
  return [
    { rank: "01", name: "Bánh mì Sài Gòn",     sold: 84, rev: 5_460_000, share: 92 },
    { rank: "02", name: "Croissant au beurre", sold: 71, rev: 3_408_000, share: 78 },
    { rank: "03", name: "Cà phê sữa đá",       sold: 58, rev: 2_204_000, share: 64 },
    { rank: "04", name: "Pain au chocolat",    sold: 44, rev: 2_420_000, share: 48 },
    { rank: "05", name: "Tart Quýt Hồng",      sold: 22, rev: 2_090_000, share: 24 },
    { rank: "06", name: "Sourdough loaf",      sold: 19, rev: 2_090_000, share: 21 },
  ];
}
