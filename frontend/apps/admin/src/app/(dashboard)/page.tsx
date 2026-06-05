"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getProducts,
  getStatisticsOverview,
  getStatisticsProducts,
  getStatisticsBranches,
  getOrders,
  getStatisticsBranch,
} from "@repo/api-client";
import type { ProductStat } from "@repo/api-client";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

function formatCompactVnd(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M₫`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K₫`;
  return `${amount.toLocaleString("vi-VN")}₫`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isSuperAdmin = roles.includes("super_admin");
  const isProductManager = roles.includes("product_manager");
  const isBranchManager = roles.includes("branch_manager");

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  } else if (isBranchManager) {
    return <BranchManagerDashboard />;
  } else if (isProductManager) {
    return <ProductManagerDashboard />;
  }

  // fallback
  return <SuperAdminDashboard />;
}

function ProductManagerDashboard() {
  // existing content unchanged
  const panelRef = useRef<HTMLDivElement>(null);
  const [listSize, setListSize] = useState(5);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const calc = () => {
      const rowH = 48;
      const reserved = 52 + 32;
      const available = el.clientHeight - reserved;
      setListSize(Math.max(3, Math.floor(available / rowH)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: topProducts } = useQuery({
    queryKey: ["statistics-products", listSize],
    queryFn: () => getStatisticsProducts(listSize),
  });

  const activeCount = products?.filter((p) => p.is_active).length ?? 0;
  const inactiveCount = (products?.length ?? 0) - activeCount;

  const KPIS = [
    { label: "Active products", value: String(activeCount) },
    { label: "Inactive", value: String(inactiveCount) },
    { label: "Total catalog", value: String(products?.length ?? 0) },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5">
        <div className="mb-1.5 flex items-center gap-3">
          <span className="block h-px w-6 bg-golden" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">Product Manager</span>
        </div>
        <h1 className="font-display tracking-tight" style={{ fontSize: "clamp(28px,4vw,38px)", lineHeight: 1, letterSpacing: "-0.02em" }}>
          Your catalog{" "}
          <span className="font-editorial text-cinnamon">· {activeCount} active</span>
        </h1>
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]">{k.label}</div>
            <div className="mt-1">
              <span className="font-display tabular-nums tracking-tight text-espresso" style={{ fontSize: "30px", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {k.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div ref={panelRef} className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-[17px] tracking-tight">Top sellers · by revenue</div>
          <Link href="/products" className="font-mono text-[10px] font-bold tracking-[0.16em] text-cinnamon">ALL PRODUCTS ↗</Link>
        </div>
        {topProducts?.items?.length === 0 && (
          <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">No sales data yet.</p>
        )}
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--admin-line)] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">
              <th className="pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Sold</th>
              <th className="pb-2 text-right font-medium">Revenue</th>
              <th className="pb-2 text-right font-medium">Branches</th>
              <th className="pb-2 text-right font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {topProducts?.items?.slice(0, listSize).map((s: ProductStat, i: number) => (
              <tr key={s.id} className="h-12 border-b border-[var(--admin-line)] last:border-0 hover:bg-[var(--admin-panel)] transition-colors">
                <td className="font-mono text-[11px] font-bold" style={{ color: i < 3 ? "var(--cinnamon)" : "var(--admin-muted)" }}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td>
                  <Link href={`/products/${s.slug}`} className="font-semibold text-espresso hover:underline">{s.name}</Link>
                </td>
                <td className="text-right font-mono text-[var(--admin-muted)]">{formatCompactVnd(s.price)}</td>
                <td className="text-right font-mono">{s.qty_sold}</td>
                <td className="text-right font-mono font-semibold text-espresso">{formatCurrency(s.revenue)}</td>
                <td className="text-right font-mono text-[var(--admin-muted)]">{s.branches_active}</td>
                <td className="text-right font-mono text-[var(--admin-muted)]">{s.total_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BranchManagerDashboard() {
  const { user } = useAuth();
  const branchId = user?.branch?.id;
  const { data } = useQuery({
    queryKey: ["statistics-branch", branchId],
    queryFn: () => getStatisticsBranch(branchId as string),
    enabled: Boolean(branchId),
  });

  if (!branchId) {
    return (
      <div className="flex h-full flex-col">
        <p className="font-editorial italic text-[var(--admin-muted)]">No branch assigned to your account.</p>
      </div>
    );
  }

  const today = data?.today ?? { orders: 0, revenue: 0 };
  const thisMonth = data?.this_month ?? { orders: 0, revenue: 0 };
  const allTime = data?.all_time ?? { orders: 0, revenue: 0 };

  const KPIS = [
    { label: "Doanh thu hôm nay", value: formatCompactVnd(today.revenue), sub: "Today" },
    { label: "Đơn hôm nay", value: String(today.orders), sub: "Today" },
    { label: "Doanh thu tháng", value: formatCompactVnd(thisMonth.revenue), sub: "This month" },
    { label: "Doanh thu all-time", value: formatCompactVnd(allTime.revenue), sub: "All time" },
  ];

  const extraKPIS = [
    { label: "Staff", value: String(data?.staff_count ?? 0) },
    { label: "Active products", value: String(data?.active_products ?? 0) },
    { label: "Customers", value: String(data?.unique_customers ?? 0) },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5">
        <div className="mb-1.5 flex items-center gap-3">
          <span className="block h-px w-6 bg-golden" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">Branch Manager</span>
        </div>
        <h1 className="font-display tracking-tight" style={{ fontSize: "clamp(28px,4vw,38px)", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {data?.branch_name ?? "Branch"} <span className="font-editorial text-cinnamon">· {today.orders} orders today</span>
        </h1>
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]">{k.label}</div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-display tabular-nums tracking-tight text-espresso" style={{ fontSize: "30px", lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</span>
            </div>
            <div className="mt-1 font-editorial text-[12px] italic text-[var(--admin-muted)]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {extraKPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]">{k.label}</div>
            <div className="mt-1">
              <span className="font-display tabular-nums tracking-tight text-espresso" style={{ fontSize: "30px", lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-4">
        <div className="mb-3 font-display text-[17px] tracking-tight">Top sellers · this branch</div>
        {data?.top_products?.length === 0 && (
          <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">No sales data yet.</p>
        )}
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--admin-line)] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">
              <th className="pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 text-right font-medium">Sold</th>
              <th className="pb-2 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.top_products?.slice(0, 5).map((p, i) => (
              <tr key={p.product_id} className="h-12 border-b border-[var(--admin-line)] last:border-0 hover:bg-[var(--admin-panel)] transition-colors">
                <td className="font-mono text-[11px] font-bold" style={{ color: i < 3 ? "var(--cinnamon)" : "var(--admin-muted)" }}>{String(i + 1).padStart(2, "0")}</td>
                <td className="font-semibold text-espresso">{p.name}</td>
                <td className="text-right font-mono">{p.qty_sold}</td>
                <td className="text-right font-mono font-semibold text-espresso">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [listSize, setListSize] = useState(5);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const calc = () => {
      const panelHeaderH = 52;
      const panelPadding = 32;
      const rowH = 48;
      const available = el.clientHeight - panelHeaderH - panelPadding;
      setListSize(Math.max(3, Math.floor(available / rowH)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const now = new Date();
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const today = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  const { data: stats } = useQuery({
    queryKey: ["statistics-overview"],
    queryFn: getStatisticsOverview,
    initialData: {
      total_customers: 0, total_branches: 0, total_products: 0,
      total_orders: 0, total_revenue: 0, total_discount: 0,
      vouchers_redeemed: 0, tier_bronze: 0, tier_silver: 0, tier_gold: 0,
    },
  });

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const activeCount = products?.filter((p) => p.is_active).length ?? stats.total_products;

  const { data: topProducts } = useQuery({
    queryKey: ["statistics-products", listSize],
    queryFn: () => getStatisticsProducts(listSize),
  });

  const { data: branchStats } = useQuery({
    queryKey: ["statistics-branches"],
    queryFn: getStatisticsBranches,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["orders-recent", listSize],
    queryFn: () => getOrders({ page: 1, size: listSize }),
  });

  const KPIS = [
    { label: "Tổng doanh thu", value: formatCompactVnd(Number(stats.total_revenue)), sub: "All time" },
    { label: "Tổng đơn hàng", value: stats.total_orders.toString(), sub: "All time" },
    { label: "Tổng khách hàng", value: stats.total_customers.toString(), sub: "All time" },
    { label: "Chiết khấu đã cấp", value: formatCompactVnd(Number(stats.total_discount)), sub: "All time" },
  ];

  const maxBranchRev = branchStats?.items?.[0]?.revenue ?? 1;

  return (
    <div className="flex h-full flex-col">
      {/* Title */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {weekday} · {today} · ICT
            </span>
          </div>
          <h1 className="font-display tracking-tight" style={{ fontSize: "clamp(28px,4vw,38px)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            Good morning, baker.{" "}
            <span className="font-editorial text-cinnamon">{activeCount} loaves so far.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/products" className="rounded-full bg-espresso px-4 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-cream">
            + Quick post
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]">{k.label}</div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-display tabular-nums tracking-tight text-espresso" style={{ fontSize: "30px", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {k.value}
              </span>
            </div>
            <div className="mt-1 font-editorial text-[12px] italic text-[var(--admin-muted)]">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom row — fills remaining height, panels clip content */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Top sellers */}
        <div ref={panelRef} className="overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-[17px] tracking-tight">Top sellers</div>
            <Link href="/products" className="font-mono text-[10px] font-bold tracking-[0.16em] text-cinnamon">VIEW ALL ↗</Link>
          </div>
          {topProducts?.items?.length === 0 && (
            <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">No sales data yet.</p>
          )}
          {topProducts?.items?.slice(0, listSize).map((s, i) => (
            <div key={s.id} className={`flex h-12 items-center gap-2.5 ${i === 0 ? "" : "border-t border-[var(--admin-line)]"}`}>
              <span className="w-[22px] font-mono text-[11px] font-bold" style={{ color: i < 3 ? "var(--cinnamon)" : "var(--admin-muted)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1 text-[12.5px] font-semibold leading-tight text-espresso truncate">{s.name}</div>
              <div className="flex-shrink-0 text-right font-mono text-[9.5px] tracking-[0.06em] text-[var(--admin-muted)]">
                <div>{s.qty_sold} sold</div>
                <div>{formatCurrency(s.revenue)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-[17px] tracking-tight">Recent orders</div>
            <Link href="/orders" className="font-mono text-[10px] font-bold tracking-[0.16em] text-cinnamon">ALL →</Link>
          </div>
          {recentOrders?.items?.length === 0 && (
            <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">No orders yet.</p>
          )}
          {recentOrders?.items?.slice(0, listSize).map((o, i) => (
            <div key={o.id} className={`flex h-12 items-center gap-2.5 text-[12px] ${i === 0 ? "" : "border-t border-[var(--admin-line)]"}`}>
              <span className="font-mono font-semibold text-espresso">{o.id.slice(0, 8)}</span>
              <span className="flex-1 truncate font-editorial italic text-[var(--admin-muted)]">{o.status}</span>
              <span className="font-mono text-espresso">{formatCurrency(o.total_amount)}</span>
            </div>
          ))}
        </div>

        {/* Branch leaderboard */}
        <div className="overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-[17px] tracking-tight">Branches · revenue</div>
            <Link href="/branches" className="font-mono text-[10px] font-bold tracking-[0.16em] text-cinnamon">ALL →</Link>
          </div>
          {branchStats?.items?.length === 0 && (
            <p className="py-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">No branch data yet.</p>
          )}
          {branchStats?.items?.slice(0, listSize).map((b, i) => (
            <div key={b.branch_id} className={`flex h-12 items-center gap-2.5 ${i === 0 ? "" : "border-t border-[var(--admin-line)]"}`}>
              <span className="w-[22px] font-mono text-[11px] font-bold" style={{ color: i < 3 ? "var(--cinnamon)" : "var(--admin-muted)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold leading-tight text-espresso">{b.branch_name}</div>
                <div className="mt-0.5 flex gap-2 font-mono text-[9.5px] tracking-[0.06em] text-[var(--admin-muted)]">
                  <span>{b.order_count} orders</span>·<span>{b.staff_count} staff</span>
                </div>
              </div>
              <div className="w-[60px]">
                <div className="h-1 rounded-sm bg-[var(--admin-panel)]">
                  <div className="h-full rounded-sm bg-cinnamon" style={{ width: `${(b.revenue / maxBranchRev) * 100}%` }} />
                </div>
                <div className="mt-0.5 text-right font-mono text-[9px] text-[var(--admin-muted)]">{formatCompactVnd(b.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
