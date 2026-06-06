"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getStatisticsOverview,
  getStatisticsProducts,
  getStatisticsBranches,
  getStatisticsBranch,
} from "@repo/api-client";
import type { ProductStat, BranchStat } from "@repo/api-client";
import { useAuth } from "@/lib/auth";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ProductSalesChart } from "@/components/charts/product-sales-chart";

function formatVnd(value: string | number): string {
  return Number(value).toLocaleString("vi-VN") + "₫";
}

function formatCompactVnd(value: string | number): string {
  const n = Number(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M₫`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K₫`;
  return `${n.toLocaleString("vi-VN")}₫`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isSuperAdmin = roles.includes("super_admin");
  const isProductManager = roles.includes("product_manager");
  const isBranchManager = roles.includes("branch_manager");
  const isBranchStaff = roles.includes("branch_staff");

  if (isBranchStaff && !isSuperAdmin && !isBranchManager && !isProductManager) {
    router.replace("/orders");
    return null;
  }

  if (isSuperAdmin) return <SuperAdminDashboard />;
  if (isBranchManager) return <BranchManagerDashboard />;
  if (isProductManager) return <ProductManagerDashboard />;
  return <SuperAdminDashboard />;
}

// ─── SUPER ADMIN ─────────────────────────────────────────────────────────────

function SuperAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["statistics-overview"],
    queryFn: getStatisticsOverview,
  });

  const { data: branchStats } = useQuery({
    queryKey: ["statistics-branches"],
    queryFn: getStatisticsBranches,
  });

  const KPIS = [
    { label: "Total Revenue", value: stats ? formatCompactVnd(stats.total_revenue) : "–" },
    { label: "Total Orders", value: String(stats?.total_orders ?? "–") },
    { label: "Customers", value: String(stats?.total_customers ?? "–") },
    { label: "Branches", value: String(stats?.total_branches ?? "–") },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-[var(--console-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--console-muted)]">{k.label}</div>
            <div className="mt-1">
              <span className="font-display tabular-nums tracking-tight text-espresso" style={{ fontSize: "28px", lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <RevenueChart />

      {/* Branch ranking table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--console-line)] bg-white p-4">
        <div className="mb-3 font-display text-[17px] tracking-tight">Branch Ranking</div>
        {!branchStats?.items?.length ? (
          <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--console-muted)]">No branch data yet.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--console-line)] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--console-muted)]">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Branch</th>
                <th className="pb-2 text-right font-medium">Orders</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
                <th className="pb-2 text-right font-medium">Staff</th>
                <th className="pb-2 text-right font-medium">Products</th>
              </tr>
            </thead>
            <tbody>
              {branchStats.items.map((b: BranchStat, i: number) => (
                <tr key={b.branch_id} className="h-10 border-b border-[var(--console-line)] last:border-0 hover:bg-[var(--console-panel)] transition-colors">
                  <td className="font-mono text-[11px] font-bold" style={{ color: i < 3 ? "var(--cinnamon)" : "var(--console-muted)" }}>{String(i + 1).padStart(2, "0")}</td>
                  <td className="font-semibold text-espresso">{b.branch_name}</td>
                  <td className="text-right font-mono">{b.order_count}</td>
                  <td className="text-right font-mono font-semibold text-espresso">{formatVnd(b.revenue)}</td>
                  <td className="text-right font-mono text-[var(--console-muted)]">{b.staff_count}</td>
                  <td className="text-right font-mono text-[var(--console-muted)]">{b.active_products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── BRANCH MANAGER ──────────────────────────────────────────────────────────

function BranchManagerDashboard() {
  const { user } = useAuth();
  const branchId = user?.branch?.id;

  const { data } = useQuery({
    queryKey: ["statistics-branch", branchId],
    queryFn: () => getStatisticsBranch(branchId as string),
    enabled: Boolean(branchId),
  });

  if (!branchId) {
    return <p className="font-editorial italic text-[var(--console-muted)]">No branch assigned to your account.</p>;
  }

  const today = data?.today ?? { orders: 0, revenue: "0" };
  const thisWeek = data?.this_week ?? { orders: 0, revenue: "0" };
  const thisMonth = data?.this_month ?? { orders: 0, revenue: "0" };
  const allTime = data?.all_time ?? { orders: 0, revenue: "0" };

  const KPIS = [
    { label: "Today", value: formatCompactVnd(today.revenue), sub: `${today.orders} orders` },
    { label: "This Week", value: formatCompactVnd(thisWeek.revenue), sub: `${thisWeek.orders} orders` },
    { label: "This Month", value: formatCompactVnd(thisMonth.revenue), sub: `${thisMonth.orders} orders` },
    { label: "All Time", value: formatCompactVnd(allTime.revenue), sub: `${allTime.orders} orders` },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-[var(--console-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--console-muted)]">{k.label}</div>
            <div className="mt-1">
              <span className="font-display tabular-nums tracking-tight text-espresso" style={{ fontSize: "28px", lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</span>
            </div>
            <div className="mt-1 font-editorial text-[11px] italic text-[var(--console-muted)]">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <RevenueChart branchId={branchId} />

      {/* Top products + extra cards */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="overflow-auto rounded-lg border border-[var(--console-line)] bg-white p-4 lg:col-span-2">
          <div className="mb-3 font-display text-[17px] tracking-tight">Top Products</div>
          {!data?.top_products?.length ? (
            <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--console-muted)]">No sales data yet.</p>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--console-line)] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--console-muted)]">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Sold</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.slice(0, 5).map((p, i) => (
                  <tr key={p.product_id} className="h-10 border-b border-[var(--console-line)] last:border-0">
                    <td className="font-mono text-[11px] font-bold" style={{ color: i < 3 ? "var(--cinnamon)" : "var(--console-muted)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td className="font-semibold text-espresso">{p.name}</td>
                    <td className="text-right font-mono">{p.qty_sold}</td>
                    <td className="text-right font-mono font-semibold text-espresso">{formatVnd(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--console-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--console-muted)]">Staff</div>
            <div className="mt-1 font-display text-[28px] tabular-nums tracking-tight text-espresso">{data?.staff_count ?? 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--console-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--console-muted)]">Active Products</div>
            <div className="mt-1 font-display text-[28px] tabular-nums tracking-tight text-espresso">{data?.active_products ?? 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--console-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--console-muted)]">Unique Customers</div>
            <div className="mt-1 font-display text-[28px] tabular-nums tracking-tight text-espresso">{data?.unique_customers ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT MANAGER ─────────────────────────────────────────────────────────

function ProductManagerDashboard() {
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const size = 20;

  const { data } = useQuery({
    queryKey: ["statistics-products", page, size],
    queryFn: () => getStatisticsProducts(size, page),
  });

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Product stats table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--console-line)] bg-white p-4">
        <div className="mb-3 font-display text-[17px] tracking-tight">Product Statistics</div>
        {items.length === 0 ? (
          <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--console-muted)]">No product data yet.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--console-line)] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--console-muted)]">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 text-right font-medium">Price</th>
                <th className="pb-2 text-right font-medium">Sold</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
                <th className="pb-2 text-right font-medium">Branches</th>
                <th className="pb-2 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s: ProductStat) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedProductId(s.id)}
                  className="h-10 cursor-pointer border-b border-[var(--console-line)] last:border-0 hover:bg-[var(--console-panel)] transition-colors"
                >
                  <td className="font-semibold text-espresso">{s.name}</td>
                  <td className="text-right font-mono text-[var(--console-muted)]">{formatVnd(s.price)}</td>
                  <td className="text-right font-mono">{s.qty_sold}</td>
                  <td className="text-right font-mono font-semibold text-espresso">{formatVnd(s.revenue)}</td>
                  <td className="text-right font-mono text-[var(--console-muted)]">{s.branches_active}</td>
                  <td className="text-right font-mono text-[var(--console-muted)]">{s.total_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded px-2 py-1 font-mono text-[11px] text-espresso disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="font-mono text-[11px] text-[var(--console-muted)]">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded px-2 py-1 font-mono text-[11px] text-espresso disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Product timeseries drawer */}
      {selectedProductId && (
        <div className="rounded-lg border border-[var(--console-line)] bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--console-muted)]">Product Timeseries</span>
            <button
              type="button"
              onClick={() => setSelectedProductId(null)}
              className="font-mono text-[11px] text-[var(--console-muted)] hover:text-espresso"
            >
              ✕ Close
            </button>
          </div>
          <ProductSalesChart productId={selectedProductId} />
        </div>
      )}
    </div>
  );
}
