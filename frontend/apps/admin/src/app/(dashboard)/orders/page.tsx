"use client";

import { useState, useEffect, useRef } from "react";
import { getOrders } from "@repo/api-client";
import type { Order } from "@repo/api-client";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const CHANNEL: Record<string, { l: string; bg: string; c: string }> = {
  app: { l: "APP", bg: "rgba(212,148,58,0.16)", c: "var(--cinnamon)" },
  web: { l: "WEB", bg: "rgba(107,143,94,0.16)", c: "var(--sage)" },
  phone: { l: "TEL", bg: "rgba(201,123,107,0.16)", c: "var(--rose)" },
};

const getCustomerName = (id: string) => {
  if (id === "order-11055") return "P. Ngọc";
  if (id === "order-11056") return "M. Trần";
  if (id === "order-11051") return "D. Linh";
  if (id === "order-11052") return "A. Vũ";
  if (id === "order-11053") return "Ms. Hằng";
  if (id === "order-11054") return "B. Sơn";
  return "Customer";
};

const getBranchCode = (branchId: string) => {
  const branchMap: Record<string, string> = {
    "br-le-loi": "LL",
    "br-pasteur": "PA",
    "br-thao-dien": "TĐ",
    "br-pmh": "PMH",
  };
  return branchMap[branchId] || branchId.replace("br-", "").toUpperCase();
};

const getRiderName = (id: string) => {
  if (id === "order-11055") return "Hùng";
  if (id === "order-11051") return "Quân";
  return "";
};

const getTag = (id: string) => {
  if (id === "order-11056") return "New cust";
  if (id === "order-11053") return "Pre-order";
  if (id === "order-11052") return "VIP";
  return undefined;
};

type OrdersView = "list" | "board" | "map" | "timeline";
type OrderColumnKey = "queued" | "baking" | "delivery" | "done";

type FilterOption = {
  value: string;
  label: string;
};

type OrderFilters = {
  branch: string;
  channel: "all" | keyof typeof CHANNEL;
  mode: "all" | "pickup" | "delivery";
  sla: "all" | "late";
};

const TERMINAL_STATUSES: Order["status"][] = [
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

const ORDERS_PAGE_SIZE = 24;

const isTerminalOrder = (status: Order["status"]) =>
  TERMINAL_STATUSES.includes(status);

const getOrderAgeMinutes = (order: Order) =>
  Math.max(
    0,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
  );

const getOrderMode = (order: Order): "pickup" | "delivery" => {
  const explicitMode = (order as Order & { delivery_mode?: string })
    .delivery_mode;
  if (explicitMode === "pickup" || explicitMode === "delivery")
    return explicitMode;
  return order.delivery_address?.toLowerCase().includes("pickup")
    ? "pickup"
    : "delivery";
};

const getOrderChannel = (order: Order): keyof typeof CHANNEL => {
  const explicitChannel = (order as Order & { channel?: keyof typeof CHANNEL })
    .channel;
  if (explicitChannel && CHANNEL[explicitChannel]) return explicitChannel;
  return order.id === "order-11056" || order.id === "order-11052"
    ? "web"
    : "app";
};

const getOrderColumnKey = (status: Order["status"]): OrderColumnKey => {
  if (["DRAFT", "PENDING_PAYMENT", "PAID", "CONFIRMED"].includes(status))
    return "queued";
  if (status === "PREPARING") return "baking";
  if (["READY", "OUT_FOR_DELIVERY"].includes(status)) return "delivery";
  return "done";
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<OrdersView>("board");
  const [filters, setFilters] = useState<OrderFilters>({
    branch: "all",
    channel: "all",
    mode: "all",
    sla: "all",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageRef = useRef(1);

  const fetchOrders = async (showLoading = false, requestedPage = pageRef.current) => {
    if (showLoading) setLoading(true);
    setError("");
      try {
        const data = await getOrders({
          page: requestedPage,
          size: ORDERS_PAGE_SIZE,
        });
        setOrders(data.items || []);
        pageRef.current = data.page;
        setPage(data.page);
        setTotalOrders(data.total);
        setTotalPages(data.pages || Math.ceil(data.total / data.size) || 1);
      } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permission") || msg.includes("forbidden")) {
        setError("You don't have permission to view orders.");
      } else {
        setError("Could not load live orders. Retry when the API is reachable.");
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to fetch orders:", err);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Grouping logic based on columns
  // Queued: PENDING_PAYMENT, PAID, CONFIRMED, DRAFT
  // Baking: PREPARING
  // Delivery: READY, OUT_FOR_DELIVERY
  // Done: COMPLETED, DELIVERED, CANCELLED
  const branchOptions = Array.from(
    new Map(
      orders.map((order) => [order.branch_id, getBranchCode(order.branch_id)]),
    ),
  );
  const branchFilterOptions = [
    { value: "all", label: "All branches" },
    ...branchOptions.map(([id, label]) => ({ value: id, label })),
  ];
  const channelFilterOptions = [
    { value: "all", label: "All channels" },
    ...Object.entries(CHANNEL).map(([value, channel]) => ({ value, label: channel.l })),
  ];
  const modeFilterOptions = [
    { value: "all", label: "Any mode" },
    { value: "delivery", label: "Delivery" },
    { value: "pickup", label: "Pickup" },
  ];
  const slaFilterOptions = [
    { value: "all", label: "SLA all" },
    { value: "late", label: "SLA late" },
  ];

  const filteredOrders = orders.filter((order) => {
    const mode = getOrderMode(order);
    const late =
      getOrderAgeMinutes(order) > 20 && !isTerminalOrder(order.status);
    if (filters.branch !== "all" && order.branch_id !== filters.branch)
      return false;
    if (filters.channel !== "all" && getOrderChannel(order) !== filters.channel)
      return false;
    if (filters.mode !== "all" && mode !== filters.mode) return false;
    if (filters.sla === "late" && !late) return false;
    return true;
  });

  const queuedOrders = filteredOrders.filter(
    (o) => getOrderColumnKey(o.status) === "queued",
  );
  const bakingOrders = filteredOrders.filter(
    (o) => getOrderColumnKey(o.status) === "baking",
  );
  const deliveryOrders = filteredOrders.filter(
    (o) => getOrderColumnKey(o.status) === "delivery",
  );
  const completedOrders = filteredOrders.filter(
    (o) => getOrderColumnKey(o.status) === "done",
  );

  const COLS = [
    {
      key: "queued",
      title: "Queued",
      sub: "awaiting kitchen",
      accent: "var(--caramel)",
      badge: queuedOrders.length.toString(),
      cta: "Start ▸",
      orders: queuedOrders,
    },
    {
      key: "baking",
      title: "In the kitchen",
      sub: "baking · plating",
      accent: "var(--golden)",
      badge: bakingOrders.length.toString(),
      pulse: true,
      cta: "Ready ✓",
      orders: bakingOrders,
    },
    {
      key: "delivery",
      title: "Out for delivery",
      sub: "rider en route / ready",
      accent: "var(--cinnamon)",
      badge: deliveryOrders.length.toString(),
      pulse: true,
      cta: "Complete ✓",
      orders: deliveryOrders,
    },
    {
      key: "done",
      title: "Completed",
      sub: "today · last 30",
      accent: "var(--sage)",
      badge: completedOrders.length.toString(),
      cta: "Receipt",
      orders: completedOrders,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              auto-refresh 5s
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{
              fontSize: "clamp(26px,3.6vw,34px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            Live orders.{" "}
            <span className="font-editorial text-cinnamon">
              {orders.filter((o) => !isTerminalOrder(o.status)).length} in
              motion
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-full border border-[var(--admin-line)] bg-white">
            {[
              { l: "List", key: "list" as const, disabled: false },
              { l: "Board", key: "board" as const, disabled: false },
              { l: "Map", key: "map" as const, disabled: true },
              { l: "Timeline", key: "timeline" as const, disabled: true },
            ].map((v) => (
              <button
                type="button"
                key={v.key}
                onClick={() => setView(v.key)}
                disabled={v.disabled}
                aria-pressed={view === v.key}
                className={`px-4 py-2 font-mono text-[10.5px] tracking-[0.12em] transition-colors ${
                  view === v.key
                    ? "bg-espresso font-bold text-white"
                    : "text-[var(--admin-muted)]"
                } ${
                  v.disabled
                    ? "cursor-not-allowed opacity-45"
                    : "hover:bg-[var(--admin-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinnamon"
                }`}
              >
                {v.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--admin-line)] pb-3">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]">
          Filter
        </span>
        <OrderFilterCombobox
          label="Branch"
          value={filters.branch}
          options={branchFilterOptions}
          onChange={(branch) => setFilters((current) => ({ ...current, branch }))}
        />
        <OrderFilterCombobox
          label="Channel"
          value={filters.channel}
          options={channelFilterOptions}
          onChange={(channel) =>
            setFilters((current) => ({
              ...current,
              channel: channel as OrderFilters["channel"],
            }))
          }
        />
        <OrderFilterCombobox
          label="Mode"
          value={filters.mode}
          options={modeFilterOptions}
          onChange={(mode) =>
            setFilters((current) => ({
              ...current,
              mode: mode as OrderFilters["mode"],
            }))
          }
        />
        <OrderFilterCombobox
          label="SLA"
          value={filters.sla}
          options={slaFilterOptions}
          onChange={(sla) =>
            setFilters((current) => ({
              ...current,
              sla: sla as OrderFilters["sla"],
            }))
          }
        />
        <div className="flex-1" />
        <span className="font-mono text-[11px] tracking-[0.08em] text-[var(--admin-muted)]">
          SLA · <span className="font-bold text-sage">98.5%</span>
          <span className="ml-3">Avg prep · </span>
          <span className="font-bold text-espresso">10m 15s</span>
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-sienna/30 bg-sienna/10 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              className="rounded-full border border-sienna/30 px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-sienna"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--admin-line)] bg-white font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--admin-muted)]">
          Loading orders...
        </div>
      ) : view === "list" ? (
        <>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white">
          <div
            className="grid items-center border-b border-[var(--admin-line)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]"
            style={{
              gridTemplateColumns:
                "1fr 1.3fr 0.7fr 0.7fr 0.8fr 0.7fr 0.9fr 1fr",
            }}
          >
            <span>Order</span>
            <span>Customer</span>
            <span>Branch</span>
            <span>Channel</span>
            <span>Mode</span>
            <span>Age</span>
            <span>Status</span>
            <span className="text-right">Next</span>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            {filteredOrders.length === 0 && (
              <div className="px-4 py-8 text-center font-editorial text-[14px] italic text-caramel">
                No orders match these filters.
              </div>
            )}
            {filteredOrders.map((o, i) => {
              const mode = getOrderMode(o);
              const channel = getOrderChannel(o);
              const mins = getOrderAgeMinutes(o);
              const late = mins > 20 && !isTerminalOrder(o.status);
              const cust = getCustomerName(o.id);
              return (
                <div
                  key={o.id}
                  className="grid items-center px-4 py-3 text-[12px]"
                  style={{
                    gridTemplateColumns:
                      "1fr 1.3fr 0.7fr 0.7fr 0.8fr 0.7fr 0.9fr 1fr",
                    borderBottom:
                      i === filteredOrders.length - 1
                        ? undefined
                        : "1px solid var(--admin-line)",
                    background: late ? "rgba(196,91,74,0.06)" : undefined,
                  }}
                >
                  <span className="font-mono font-semibold text-espresso">
                    {o.id.replace("order-", "#")}
                  </span>
                  <span className="truncate font-editorial italic text-cocoa">
                    {cust}
                  </span>
                  <span className="font-mono text-[10.5px] font-bold tracking-[0.1em] text-cinnamon">
                    {getBranchCode(o.branch_id)}
                  </span>
                  <span
                    className="font-mono text-[10.5px] font-bold tracking-[0.14em]"
                    style={{ color: CHANNEL[channel].c }}
                  >
                    {CHANNEL[channel].l}
                  </span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                    {mode}
                  </span>
                  <span
                    className={`font-mono text-[10.5px] font-bold ${late ? "text-sienna" : "text-[var(--admin-muted)]"}`}
                  >
                    {mins}m
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.08em] text-espresso">
                    {o.status}
                  </span>
                  <span className="text-right">
                    <span className="rounded-full bg-[var(--admin-panel)] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-[var(--admin-muted)]">
                      Read only
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => (
            <div
              key={col.key}
              className="flex min-h-0 flex-col rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)]"
            >
              <div className="flex items-center gap-2.5 rounded-t-xl border-b border-[var(--admin-line)] bg-[#fffaf2] px-3.5 py-3">
                <span
                  className={`block h-2 w-2 rounded-full ${col.pulse ? "bkr-pulse" : ""}`}
                  style={{ background: col.accent }}
                />
                <div className="flex-1">
                  <div className="font-display text-[16px] leading-none tracking-tight text-espresso">
                    {col.title}
                  </div>
                  <div className="mt-0.5 font-editorial text-[11.5px] italic text-[var(--admin-muted)]">
                    {col.sub}
                  </div>
                </div>
                <span className="rounded-full bg-espresso px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.06em] text-white">
                  {col.badge}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-auto p-2.5">
                {col.orders.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--admin-line)] bg-white/60 p-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">
                    No orders here.
                  </div>
                )}
                {col.orders.map((o) => {
                  const orderNum = o.id.replace("order-", "#");
                  const mins = Math.max(0, getOrderAgeMinutes(o));
                  const mode = getOrderMode(o);
                  const channel = getOrderChannel(o);
                  const ch = CHANNEL[channel];
                  const late = mins > 20 && !isTerminalOrder(o.status);
                  const cust = getCustomerName(o.id);
                  const branch = getBranchCode(o.branch_id);
                  const rider = getRiderName(o.id);
                  const tag = getTag(o.id);
                  const itemsStr = o.items
                    .map(
                      (item) =>
                        `${item.product_name.split(" ")[0]} × ${item.quantity}`,
                    )
                    .join(" · ");

                  return (
                    <div
                      key={o.id}
                      className="rounded-lg bg-white p-3.5"
                      style={{
                        border: `1px solid ${late ? "var(--sienna)" : "var(--admin-line)"}`,
                        boxShadow: late
                          ? "0 0 0 2px rgba(196,91,74,0.13)"
                          : "none",
                      }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-mono text-[11.5px] font-bold tracking-[0.04em] text-espresso">
                          {orderNum}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.18em]"
                          style={{ background: ch.bg, color: ch.c }}
                        >
                          {ch.l}
                        </span>
                        <span className="rounded border border-[var(--admin-line-2)] px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.18em] text-[var(--admin-muted)]">
                          {mode === "delivery" ? "⏍ DEL" : "◧ PU"}
                        </span>
                        <span
                          className="ml-auto font-mono text-[10.5px] font-bold tracking-[0.04em]"
                          style={{
                            color: late
                              ? "var(--sienna)"
                              : mins > 15
                                ? "var(--cinnamon)"
                                : "var(--admin-muted)",
                          }}
                        >
                          {mins}m
                        </span>
                      </div>

                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cinnamon font-display text-[12px] text-white">
                          {cust.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold leading-tight text-espresso">
                            {cust}
                          </div>
                          <div className="font-mono text-[9.5px] tracking-[0.08em] text-[var(--admin-muted)]">
                            {branch} {rider ? `· 🛵 ${rider}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="mb-2.5 font-editorial text-[12.5px] italic leading-[1.35] text-cocoa">
                        {itemsStr}
                      </div>

                      <div className="flex items-center justify-between border-t border-dashed border-[var(--admin-line)] pt-2.5">
                        <span className="font-display text-[15px] text-espresso">
                          {formatCurrency(o.total_amount).replace("₫", "")}
                          <span className="ml-0.5 text-[11px] text-[var(--admin-muted)]">
                            ₫
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {tag && (
                            <span
                              className="rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.18em]"
                              style={{
                                background: late
                                  ? "rgba(196,91,74,0.15)"
                                  : "rgba(212,148,58,0.15)",
                                color: late
                                  ? "var(--sienna)"
                                  : "var(--cinnamon)",
                              }}
                            >
                              {tag}
                            </span>
                          )}
                          <span className="rounded-full bg-[var(--admin-panel)] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-[var(--admin-muted)]">
                            Read only
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && totalPages > 1 && (
        <nav
          aria-label="Orders pagination"
          className="mt-4 flex items-center justify-between rounded-lg border border-[var(--admin-line)] bg-white px-4 py-3"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => fetchOrders(true, page - 1)}
            className="rounded-full border border-[var(--admin-line)] px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-espresso disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">
            Page {page} of {totalPages} · {totalOrders} orders
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchOrders(true, page + 1)}
            className="rounded-full border border-espresso bg-espresso px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:border-[var(--admin-line)] disabled:bg-white disabled:text-espresso disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

function OrderFilterCombobox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((option) => option.value === value) ?? options[0];
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );
  const active = value !== "all";

  return (
    <div ref={containerRef} className="relative min-w-[150px]">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} filter. Current: ${selected?.label ?? value}`}
        className={`flex w-full items-center justify-between rounded-full border border-[var(--admin-line)] px-3 py-1.5 text-left font-mono text-[11px] text-espresso ${
          active ? "bg-[var(--admin-panel)] font-bold" : "bg-white"
        }`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown aria-hidden="true" className="ml-2 h-3.5 w-3.5 shrink-0 text-[var(--admin-muted)]" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 rounded-lg border border-[var(--admin-line)] bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="mb-2 h-8 w-full rounded-md border border-[var(--admin-line)] px-2 font-mono text-[11px] text-espresso outline-none focus:border-cinnamon"
          />
          <div className="max-h-56 space-y-1 overflow-y-auto" role="listbox">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full rounded-md px-2 py-1.5 text-left font-mono text-[11px] text-espresso hover:bg-[var(--admin-panel)] ${
                    value === option.value ? "bg-[var(--admin-panel)] font-bold" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-center font-mono text-[11px] text-[var(--admin-muted)]">
                No matches.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
