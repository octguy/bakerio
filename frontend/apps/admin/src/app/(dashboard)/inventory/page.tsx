"use client";

import { useState, useEffect } from "react";
import { getInventory, getInventoryHealth } from "@repo/api-client/mock/inventory";
import type { InventoryItem } from "@repo/api-client/mock/inventory";
import { formatCurrency } from "@/lib/utils";

const LVL: Record<InventoryItem["lvl"], { c: string; l: string }> = {
  critical: { c: "var(--sienna)", l: "Critical" },
  low: { c: "var(--golden)", l: "Low" },
  ok: { c: "var(--sage)", l: "OK" },
};

type InventoryGroupFilter = "All" | InventoryItem["group"];

const groups: InventoryGroupFilter[] = ["All", "Flour", "Dairy", "Banh mi", "Coffee", "Filling", "Other"];

export default function InventoryPage() {
  const [group, setGroup] = useState<InventoryGroupFilter>("All");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [health, setHealth] = useState<{
    totalValue: number;
    itemsTracked: number;
    lowStock: number;
    critical: number;
  }>();

  const fetchInventoryData = async () => {
    try {
      const itemsData = await getInventory(group === "All" ? undefined : group);
      const healthData = await getInventoryHealth();
      setItems(itemsData);
      setHealth(healthData);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    }
  };

  useEffect(() => {
    fetchInventoryData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [group]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = [
    {
      l: "Inventory value",
      v: health ? `${(health.totalValue / 1_000_000).toFixed(1)}M₫` : "0₫",
      d: "+1.8%",
      dc: "var(--sage)",
    },
    { l: "Items tracked", v: health?.itemsTracked.toString() ?? "0", d: "+4", dc: "var(--sage)" },
    {
      l: "Low stock",
      v: health?.lowStock.toString() ?? "0",
      d: `+${health?.lowStock ?? 0}`,
      dc: "var(--golden)",
      warn: true,
    },
    {
      l: "Critical",
      v: health?.critical.toString() ?? "0",
      d: "urgent",
      dc: "var(--sienna)",
      warn: true,
      alert: (health?.critical ?? 0) > 0,
    },
  ];

  const belowParCount = items.filter((item) => item.lvl !== "ok").length;

  return (
    <div>
      {/* Title */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              Cập nhật mỗi giờ · last count 06:00
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(26px,3.6vw,32px)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            Inventory <span className="font-editorial text-cinnamon">· what&apos;s in the larder</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-[var(--admin-line)] bg-white px-4 py-2 text-[12px] font-semibold">
            ↧ Stock-take CSV
          </button>
          <button className="rounded-full bg-sienna px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-white">
            ★ Create PO · {belowParCount} items
          </button>
        </div>
      </div>

      {/* Health strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.l}
            className="rounded-lg bg-white p-4"
            style={{
              border: `1px solid ${k.alert ? "var(--sienna)" : "var(--admin-line)"}`,
              boxShadow: k.alert ? "0 0 0 2px rgba(196,91,74,0.13)" : undefined,
            }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]">
              {k.l}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span
                className="font-display text-[28px] leading-none tracking-tight"
                style={{ color: k.warn ? k.dc : "var(--espresso)" }}
              >
                {k.v}
              </span>
              <span className="font-mono text-[10.5px] font-bold tracking-[0.06em]" style={{ color: k.dc }}>
                {k.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--admin-line)] pb-3">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] transition-colors ${
              group === g ? "bg-espresso font-bold text-white" : "border border-[var(--admin-line)] bg-white text-espresso hover:bg-[var(--admin-panel)]"
            }`}
          >
            {g}
          </button>
        ))}
        <div className="flex-1" />
        <span className="rounded-full bg-sienna/10 px-3 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.16em] text-sienna">
          ● {belowParCount} below par
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--admin-line)] bg-white">
        <div
          className="grid items-center border-b border-[var(--admin-line)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]"
          style={{ gridTemplateColumns: "2.4fr 0.7fr 1fr 1.4fr 1.2fr 1fr" }}
        >
          <span>Ingredient</span>
          <span>Group</span>
          <span>Supplier</span>
          <span>Stock vs par</span>
          <span className="text-right">Unit cost</span>
          <span>Status</span>
        </div>
        {items.map((it, i) => {
          const pct = Math.min(1, it.stock / it.par);
          const bar = LVL[it.lvl].c;
          return (
            <div
              key={it.sku}
              className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: "2.4fr 0.7fr 1fr 1.4fr 1.2fr 1fr",
                borderBottom: i === items.length - 1 ? undefined : "1px solid var(--admin-line)",
                background: it.lvl === "critical" ? "rgba(196,91,74,0.06)" : undefined,
              }}
            >
              <div>
                <div className="text-[13.5px] font-semibold">{it.name}</div>
                <div className="font-mono text-[10px] tracking-[0.06em] text-[var(--admin-muted)]">
                  {it.sku} · last count {it.updated} ago
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-cinnamon">{it.group}</span>
              <span className="font-editorial text-[13px] italic text-caramel">{it.supplier}</span>
              <div>
                <div className="flex items-baseline gap-1 font-mono text-[12px] tracking-[0.04em]">
                  <span className="font-bold" style={{ color: bar }}>
                    {it.stock}
                  </span>
                  <span className="text-[var(--admin-muted)]">
                    / {it.par} {it.unit}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-sm bg-[var(--admin-panel)]">
                  <div className="h-full rounded-sm" style={{ width: `${pct * 100}%`, background: bar }} />
                </div>
              </div>
              <span className="text-right font-mono text-[12px] tracking-[0.04em]">
                {(it.cost / 1000).toLocaleString("vi-VN")}K
                <span className="ml-0.5 text-[10px] text-[var(--admin-muted)]">₫/{it.unit}</span>
              </span>
              <span>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em]"
                  style={{ background: `${bar}22`, color: bar }}
                >
                  ● {LVL[it.lvl].l}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-right font-mono text-[10.5px] tracking-[0.06em] text-[var(--admin-muted)]">
        {formatCurrency(items.reduce((s, i) => s + i.cost * i.stock, 0))} on hand · {items.length} items shown
      </p>
    </div>
  );
}
