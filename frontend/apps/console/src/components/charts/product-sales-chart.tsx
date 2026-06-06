"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getProductTimeseries } from "@repo/api-client";

type Granularity = "day" | "week" | "month" | "year";

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function formatLabel(bucket: string, granularity: Granularity): string {
  const d = new Date(bucket);
  if (granularity === "day") return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  if (granularity === "week") return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("vi-VN", { month: "short" })}`;
  if (granularity === "month") return d.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });
  return d.getFullYear().toString();
}

function formatVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function ProductSalesChart({ productId, branchId }: { productId: string; branchId?: string }) {
  const [granularity, setGranularity] = useState<Granularity>("month");

  const { data, isLoading } = useQuery({
    queryKey: ["product-timeseries", productId, granularity, branchId],
    queryFn: () => getProductTimeseries(productId, { granularity, branch_id: branchId }),
    enabled: !!productId,
  });

  const chartData = data?.points?.map((p) => ({
    label: formatLabel(p.bucket_start, granularity),
    qty_sold: p.qty_sold,
    revenue: Number(p.revenue),
  })) ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-[15px] tracking-tight">
          {data?.product_name ?? "Product"} — Sales
        </div>
        <div className="flex gap-1">
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGranularity(opt.value)}
              className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                granularity === opt.value
                  ? "bg-espresso text-cream"
                  : "text-[var(--console-muted)] hover:bg-[var(--console-panel)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[240px] items-center justify-center">
          <span className="font-mono text-xs text-[var(--console-muted)]">Loading…</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center">
          <span className="font-editorial text-[13px] italic text-[var(--console-muted)]">No sales data yet.</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--console-line)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--console-muted)" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--console-muted)" }} tickLine={false} axisLine={false} label={{ value: "Qty", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "var(--console-muted)" } }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--console-muted)" }} tickLine={false} axisLine={false} tickFormatter={formatVnd} label={{ value: "VND", angle: 90, position: "insideRight", style: { fontSize: 9, fill: "var(--console-muted)" } }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--console-line)" }}
              formatter={(value, name) => [
                name === "revenue" ? `${formatVnd(Number(value))}₫` : Number(value),
                name === "revenue" ? "Revenue" : "Units sold",
              ]}
            />
            <Bar yAxisId="left" dataKey="qty_sold" fill="var(--golden)" fillOpacity={0.6} radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="var(--cinnamon)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
