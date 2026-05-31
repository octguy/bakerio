"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@repo/api-client";
import {
  getMockDashboardStats,
  getMockDailyRevenue,
  getMockRecentOrders,
  getMockHeatmap,
  getMockAlerts,
  getMockTopSellers,
} from "@repo/api-client/mock/analytics";
import { formatCurrency } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const heatColor = (v: number) => {
  const stops = [
    "#F5EBD9",
    "#F1DDB6",
    "#EBC892",
    "#E5B26B",
    "#D4943A",
    "#B5722A",
    "#8A4D14",
  ];
  return stops[Math.min(stops.length - 1, Math.floor(v * stops.length))];
};

const SEV: Record<string, string> = {
  red: "var(--sienna)",
  amber: "var(--golden)",
  green: "var(--sage)",
};

function formatCompactVnd(amount: number) {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M₫`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}K₫`;
  }
  return `${amount.toLocaleString("vi-VN")}₫`;
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 88;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill={color}
        opacity="0.16"
      />
      <polyline
        className="bkr-draw"
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ animationDelay: "300ms" }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const today = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  const stats = getMockDashboardStats();
  const dailyRev = getMockDailyRevenue();
  const recent = getMockRecentOrders();
  const heatmapData = getMockHeatmap();
  const alertsData = getMockAlerts();
  const topSellersData = getMockTopSellers();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  const activeCount =
    products?.filter((p) => p.is_active).length ?? stats.activeProducts;
  const averageBasket = stats.totalOrders > 0 ? stats.revenue / stats.totalOrders : 0;

  const KPIS = [
    {
      label: "Doanh thu · today",
      value: formatCompactVnd(stats.revenue),
      delta: "+12.4%",
      sub: "vs 7d avg",
      spark: [12, 14, 11, 13, 16, 14, 15, 17, 14, 15],
      color: "var(--cinnamon)",
    },
    {
      label: "Đơn hàng · today",
      value: stats.totalOrders.toString(),
      delta: "+8.1%",
      sub: "418 forecast",
      spark: [22, 28, 24, 30, 35, 32, 38, 40, 36, 42],
      color: "var(--sage)",
    },
    {
      label: "Trung bình giỏ",
      value: formatCompactVnd(averageBasket),
      delta: "+3.6%",
      sub: "WoW",
      spark: [120, 125, 118, 130, 124, 128, 132, 126, 128, 128],
      color: "var(--golden)",
    },
    {
      label: "Cảnh báo kho",
      value: stats.lowStockItems.toString(),
      delta: "+2",
      sub: "since 06:00",
      spark: [3, 3, 4, 4, 5, 5, 5, 6, 7, 7],
      color: "var(--sienna)",
      warn: true,
    },
  ];

  return (
    <div>
      {/* Title */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {weekday} · {today} · ICT
            </span>
            <span className="rounded-full bg-sienna/10 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-sienna">
              Demo analytics · mock data
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{
              fontSize: "clamp(28px,4vw,38px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            Good morning, baker.{" "}
            <span className="font-editorial text-cinnamon">
              {activeCount} loaves so far.
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-[var(--admin-line)] bg-white px-4 py-2 text-[12px] font-semibold tracking-wide">
            ↧ Export CSV
          </button>
          <Link
            href="/products"
            className="rounded-full bg-espresso px-4 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-cream"
          >
            + Quick post
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-4"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]">
              {k.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span
                className="font-display tabular-nums tracking-tight text-espresso"
                style={{
                  fontSize: "30px",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {k.value}
              </span>
              <span
                className="font-mono text-[10.5px] font-bold tracking-[0.04em]"
                style={{ color: k.warn ? "var(--sienna)" : "var(--sage)" }}
              >
                {k.delta}
              </span>
            </div>
            <div className="mt-1 font-editorial text-[12px] italic text-[var(--admin-muted)]">
              {k.sub}
            </div>
            <div className="absolute right-3.5 top-4">
              <Spark data={k.spark} color={k.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Mid row */}
      <div className="mb-3.5 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        {/* Heatmap */}
        <div className="rounded-lg border border-[var(--admin-line)] bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <div className="font-display text-[18px] tracking-tight">
                Order density · by hour
              </div>
              <div className="font-editorial text-[12px] italic text-[var(--admin-muted)]">
                last 7 days · 07:00 → 21:00
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-[var(--admin-muted)]">
              LOW
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                <span
                  key={v}
                  className="block h-3.5 w-3.5 rounded-sm"
                  style={{ background: heatColor(v) }}
                />
              ))}
              HIGH
            </div>
          </div>
          <div className="mb-1 flex gap-1 pl-[36px]">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 text-center font-mono text-[9px] tracking-[0.06em] text-[var(--admin-muted)]"
              >
                {String(i + 7).padStart(2, "0")}
              </div>
            ))}
          </div>
          {heatmapData.grid.map((row, di) => (
            <div key={di} className="mb-1 flex items-center gap-1">
              <div
                className={`w-[34px] pr-1.5 text-right font-mono text-[10.5px] tracking-[0.08em] ${
                  di === 5
                    ? "font-bold text-cinnamon"
                    : "text-[var(--admin-muted)]"
                }`}
              >
                {DAYS[di]}
              </div>
              {row.map((v, hi) => (
                <div
                  key={hi}
                  className="aspect-square max-h-[22px] flex-1 rounded-sm"
                  style={{ background: heatColor(v) }}
                />
              ))}
            </div>
          ))}
          <div className="mt-2.5 pl-[36px] font-mono text-[10px] tracking-[0.1em] text-[var(--admin-muted)]">
            Peak:{" "}
            <span className="font-bold text-cinnamon">
              {heatmapData.peak.day}{" "}
              {String(heatmapData.peak.hour).padStart(2, "0")}:00
            </span>{" "}
            · {heatmapData.peak.ordersPerHour} orders / hour
          </div>
        </div>

        {/* Daily revenue bars */}
        <div className="rounded-lg border border-[var(--admin-line)] bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <div className="font-display text-[18px] tracking-tight">
                Daily revenue
              </div>
              <div className="font-editorial text-[12px] italic text-[var(--admin-muted)]">
                week · million ₫
              </div>
            </div>
            <div className="flex gap-1">
              {["1W", "2W", "1M", "YTD"].map((tab, i) => (
                <span
                  key={tab}
                  className={`rounded px-2 py-1 font-mono text-[10.5px] tracking-[0.1em] ${
                    i === 0
                      ? "bg-espresso font-bold text-white"
                      : "text-[var(--admin-muted)]"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 460 200" className="h-[200px] w-full">
            {[0, 1, 2, 3, 4].map((g) => (
              <line
                key={g}
                x1="30"
                x2="450"
                y1={20 + g * 36}
                y2={20 + g * 36}
                stroke="var(--admin-line)"
                strokeDasharray="2 4"
              />
            ))}
            {[30, 22.5, 15, 7.5, 0].map((y, i) => (
              <text
                key={i}
                x="22"
                y={24 + i * 36}
                className="font-mono"
                fontSize="9"
                fill="var(--admin-muted)"
                textAnchor="end"
              >
                {y}M
              </text>
            ))}
            {dailyRev.map((d, i) => {
              const m = d.revenue / 1_000_000;
              const x = 50 + i * 55;
              const h = (m / 30) * 144;
              const top = 164 - h;
              const today = i === dailyRev.length - 1;
              return (
                <g
                  key={i}
                  className="bkr-grow-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    transformBox: "fill-box",
                    transformOrigin: "50% 100%",
                  }}
                >
                  <rect
                    x={x}
                    y={top}
                    width="36"
                    height={h}
                    rx="2"
                    fill={today ? "var(--cinnamon)" : "var(--golden)"}
                    opacity={today ? 1 : 0.65}
                  />
                  <text
                    x={x + 18}
                    y={182}
                    className="font-mono"
                    fontSize="9"
                    fill="var(--admin-muted)"
                    textAnchor="middle"
                  >
                    {d.date}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Top sellers */}
        <div className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-[17px] tracking-tight">
              Top sellers · today
            </div>
            <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-cinnamon">
              VIEW ALL ↗
            </span>
          </div>
          {topSellersData.map((s, i) => (
            <div
              key={s.name}
              className={`flex items-center gap-2.5 py-2 ${i === 0 ? "" : "border-t border-[var(--admin-line)]"}`}
            >
              <span
                className="w-[22px] font-mono text-[11px] font-bold"
                style={{
                  color: i < 3 ? "var(--cinnamon)" : "var(--admin-muted)",
                }}
              >
                {s.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold leading-tight text-espresso">
                  {s.name}
                </div>
                <div className="mt-0.5 flex gap-2 font-mono text-[9.5px] tracking-[0.06em] text-[var(--admin-muted)]">
                  <span>{s.sold} sold</span>·
                  <span>{formatCurrency(s.rev)}</span>
                </div>
              </div>
              <div className="w-[60px]">
                <div className="h-1 rounded-sm bg-[var(--admin-panel)]">
                  <div
                    className="h-full rounded-sm bg-cinnamon"
                    style={{ width: `${s.share}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="rounded-lg border border-[var(--admin-line)] bg-white p-4 lg:col-span-1">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-[17px] tracking-tight">
              Demo recent orders
            </div>
            <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-cinnamon">
              ALL →
            </span>
          </div>
          {recent.map((o, i) => (
            <div
              key={o.id}
              className={`flex items-center gap-2.5 py-2 text-[12px] ${i === 0 ? "" : "border-t border-[var(--admin-line)]"}`}
            >
              <span className="font-mono font-semibold text-espresso">
                {o.id}
              </span>
              <span className="flex-1 font-editorial italic text-[var(--admin-muted)]">
                {o.customer}
              </span>
              <span className="font-mono text-espresso">
                {formatCurrency(o.total).replace("₫", "")}₫
              </span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-[17px] tracking-tight">
              Demo alerts
            </div>
            <span className="rounded bg-sienna/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-sienna">
              {alertsData.filter((a) => a.sev === "red").length} RED
            </span>
          </div>
          {alertsData.map((a, i) => (
            <div
              key={i}
              className={`flex gap-2.5 py-2 ${i === 0 ? "" : "border-t border-[var(--admin-line)]"}`}
            >
              <div
                className={`w-1 flex-shrink-0 rounded-sm ${a.sev === "red" ? "bkr-pulse" : ""}`}
                style={{ background: SEV[a.sev] }}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span
                    className="font-mono text-[9px] font-bold tracking-[0.2em]"
                    style={{ color: SEV[a.sev] }}
                  >
                    {a.tag}
                  </span>
                  <span className="font-mono text-[9.5px] tracking-[0.08em] text-[var(--admin-muted)]">
                    · {a.branch}
                  </span>
                  <span className="ml-auto font-mono text-[9.5px] text-[var(--admin-muted)]">
                    {a.time} ago
                  </span>
                </div>
                <div className="text-[12.5px] leading-tight text-espresso">
                  {a.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
