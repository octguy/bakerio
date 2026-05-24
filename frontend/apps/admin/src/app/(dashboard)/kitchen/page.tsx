"use client";

import { useState, useEffect } from "react";
import { getKitchenTickets, getKitchenCounts } from "@repo/api-client/mock/kitchen";
import type { KitchenTicket, KitchenStation } from "@repo/api-client/mock/kitchen";

const SEV_PAL: Record<
  KitchenTicket["sev"],
  { stripe: string; tagBg: string; tagC: string; label: string }
> = {
  fresh: { stripe: "var(--sage)", tagBg: "rgba(107,143,94,0.16)", tagC: "var(--sage)", label: "NEW" },
  normal: { stripe: "var(--cinnamon)", tagBg: "rgba(212,148,58,0.16)", tagC: "var(--cinnamon)", label: "COOK" },
  warning: { stripe: "var(--golden)", tagBg: "rgba(212,148,58,0.2)", tagC: "var(--cinnamon)", label: "VIP" },
  late: { stripe: "var(--sienna)", tagBg: "rgba(196,91,74,0.18)", tagC: "var(--sienna)", label: "LATE" },
};

export default function KitchenPage() {
  const [station, setStation] = useState<KitchenStation | "All">("All");
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [counts, setCounts] = useState<{
    queue: number;
    avgPrepLabel: string;
    late: number;
    byStation: Record<KitchenStation | "All", number>;
  }>();

  const fetchKitchenData = async () => {
    try {
      const ticketsData = await getKitchenTickets(station === "All" ? undefined : station);
      const countsData = await getKitchenCounts();
      setTickets(ticketsData);
      setCounts(countsData);
    } catch (err) {
      console.error("Failed to fetch kitchen data:", err);
    }
  };

  useEffect(() => {
    fetchKitchenData(); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchKitchenData, 3000); // 3s auto-refresh
    return () => clearInterval(interval);
  }, [station]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = [
    { l: "Queue", v: counts?.queue.toString() ?? "0", c: "var(--honey)" },
    { l: "Avg prep", v: counts?.avgPrepLabel ?? "0s", c: "var(--cream)" },
    { l: "Late", v: counts?.late.toString() ?? "0", c: "var(--sienna)" },
  ];

  const tabs = [
    { l: "All stations", s: "All" as const, n: counts?.byStation.All ?? 0 },
    { l: "Bread", s: "Bread" as const, n: counts?.byStation.Bread ?? 0 },
    { l: "Pastry", s: "Pastry" as const, n: counts?.byStation.Pastry ?? 0 },
    { l: "Coffee", s: "Coffee" as const, n: counts?.byStation.Coffee ?? 0 },
  ];

  return (
    <div className="-mx-7 -mt-6 flex h-[calc(100vh-60px)] flex-col bg-cream">
      {/* Header */}
      <header className="flex items-center gap-6 bg-espresso px-8 py-5 text-cream">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 22V8" stroke="var(--honey)" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z" stroke="var(--honey)" strokeWidth="1.3" />
        </svg>
        <span className="font-display text-[24px] leading-none">
          Kitchen · <span className="font-editorial text-honey">Lê Lợi</span>
        </span>
        <div className="flex-1" />
        {kpis.map((k) => (
          <div key={k.l} className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/60">{k.l}</span>
            <span className="font-display text-[22px] leading-none tracking-tight" style={{ color: k.c }}>
              {k.v}
            </span>
          </div>
        ))}
        <div className="inline-flex items-center gap-2 rounded-lg bg-honey/18 px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-honey">
          <span className="bkr-pulse h-2 w-2 rounded-full bg-honey" />
          {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · SAT
        </div>
      </header>

      {/* Station tabs */}
      <div className="flex items-center gap-3 border-b border-crust bg-cream px-8 py-3.5">
        {tabs.map((tab) => (
          <button
            key={tab.l}
            onClick={() => setStation(tab.s)}
            className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[14px] tracking-wide ${
              station === tab.s ? "bg-espresso font-bold text-white" : "border border-crust bg-white font-semibold text-espresso"
            }`}
          >
            {tab.l}
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
                station === tab.s ? "bg-honey text-espresso" : "bg-vanilla text-caramel"
              }`}
            >
              {tab.n}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-caramel">
          Auto-refresh 3s · Sound on ♪
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-flow-row-dense grid-cols-1 gap-4 overflow-y-auto p-8 lg:grid-cols-3">
        {tickets.map((o) => {
          const sev = SEV_PAL[o.sev];
          const frac = Math.min(1, o.mins / o.target);
          return (
            <div
              key={o.id}
              className="flex overflow-hidden rounded-xl bg-white"
              style={{
                border: o.sev === "late" ? "2px solid var(--sienna)" : "1px solid var(--crust)",
                boxShadow: o.sev === "late" ? "0 0 0 4px rgba(196,91,74,0.1)" : "0 6px 14px -8px rgba(44,24,16,0.12)",
              }}
            >
              <div className="w-2 flex-shrink-0" style={{ background: sev.stripe }} />
              <div className="flex flex-1 flex-col p-5">
                {/* Top: ID + tags */}
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="font-display text-[26px] leading-none tracking-tight text-espresso">#{o.id}</span>
                  <span
                    className="rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{
                      background: o.mode === "DEL" ? "rgba(212,148,58,0.18)" : "rgba(166,139,107,0.16)",
                      color: o.mode === "DEL" ? "var(--cinnamon)" : "var(--caramel)",
                    }}
                  >
                    {o.mode === "DEL" ? "DELIVERY" : "PICKUP"}
                  </span>
                  <span
                    className="rounded px-2 py-1 font-mono text-[10px] font-bold tracking-[0.2em]"
                    style={{ background: sev.tagBg, color: sev.tagC }}
                  >
                    {sev.label}
                  </span>
                  {o.tag && (
                    <span className="rounded bg-sienna px-2 py-1 font-mono text-[10px] font-bold tracking-[0.18em] text-white">
                      {o.tag}
                    </span>
                  )}
                  <span className="ml-auto font-display text-[30px] leading-none tracking-tight" style={{ color: sev.stripe }}>
                    {o.mins}
                    <span className="ml-1 text-[16px] text-[var(--admin-muted)]">m</span>
                  </span>
                </div>

                {/* Customer */}
                <div className="mb-3.5 flex items-center gap-2 font-editorial text-[14px] italic text-cinnamon">
                  <span>{o.cust}</span>
                  <span className="text-[var(--admin-muted)]">·</span>
                  <span className="font-mono not-italic text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                    {o.station}
                  </span>
                </div>

                {/* Items */}
                <div className="mb-3.5 flex flex-1 flex-col gap-1.5">
                  {o.items.map((it, i) => (
                    <div key={i} className={`flex items-start gap-3 py-2 ${i === 0 ? "" : "border-t border-crust"}`}>
                      <span className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md border border-crust bg-[var(--admin-panel)] font-mono text-[13px] font-bold text-espresso">
                        {it.q}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[18px] font-semibold leading-[1.15] text-espresso">{it.n}</div>
                        {it.mod && (
                          <div className="mt-0.5 font-editorial text-[13px] italic text-cinnamon">↳ {it.mod}</div>
                        )}
                      </div>
                      <span className="h-6 w-6 flex-shrink-0 rounded border-[1.5px] border-crust bg-white" />
                    </div>
                  ))}
                </div>

                {/* Progress + actions */}
                <div>
                  <div className="h-[5px] overflow-hidden rounded-sm bg-[var(--admin-panel)]">
                    <div className="h-full rounded-sm" style={{ width: `${frac * 100}%`, background: sev.stripe }} />
                  </div>
                  <div className="mt-1.5 flex justify-between font-mono text-[10px] tracking-[0.08em] text-[var(--admin-muted)]">
                    <span>
                      {o.mins}/{o.target} min
                    </span>
                    <span>
                      {o.sev === "late" ? (
                        <span className="font-bold text-sienna">OVER TARGET</span>
                      ) : (
                        `${o.target - o.mins}m to go`
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button className="bkr-press flex-1 rounded-lg bg-espresso px-3 py-3.5 font-mono text-[14px] font-bold uppercase tracking-[0.06em] text-white">
                    ✓ Mark ready
                  </button>
                  <button className="rounded-lg border border-crust bg-white px-4 py-3.5 font-mono text-[12px] font-bold tracking-[0.12em] text-espresso">
                    ↺
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
