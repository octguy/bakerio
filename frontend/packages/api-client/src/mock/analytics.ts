// Mock analytics data for dashboard

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
    { id: "ORD-1002", customer: "Trần Thị B", total: 128_000, status: "PREPARING" as const, date: "2026-05-20T08:42:00Z" },
    { id: "ORD-1003", customer: "Lê Văn C", total: 562_000, status: "DELIVERED" as const, date: "2026-05-20T07:30:00Z" },
    { id: "ORD-1004", customer: "Phạm Thị D", total: 245_000, status: "PENDING_PAYMENT" as const, date: "2026-05-19T22:10:00Z" },
    { id: "ORD-1005", customer: "Hoàng Văn E", total: 890_000, status: "COMPLETED" as const, date: "2026-05-19T20:45:00Z" },
  ];
}
