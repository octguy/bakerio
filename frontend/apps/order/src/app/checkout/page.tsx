"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { Link } from "next-view-transitions";
import { z } from "zod";
import {
  addAddress,
  confirmOrder,
  findOrderBranches,
  getMembership,
  getMyProfile,
  selectOrderBranch,
  type Membership,
  type OrderBranchOption,
  type OrderMissingItem,
  type SelectOrderBranchResponse,
} from "@repo/api-client";
import { getAddresses } from "@repo/api-client";
import type { SavedAddress } from "@repo/api-client";
import { getAvailableCoupons } from "@/lib/vouchers";
import type { Coupon } from "@/types";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth";
import { useCartStore } from "@/store/cart";
import { formatVND } from "@/lib/format";
import Loading from "./loading";

const AddressMapPicker = dynamic(
  () => import("@/components/AddressMapPicker").then((mod) => mod.AddressMapPicker),
  { ssr: false, loading: () => <div className="h-64 rounded-2xl border border-crust bg-butter" /> },
);

const checkoutSchema = z.object({
  items: z.array(z.any()).min(1, "Cart cannot be empty"),
  branchId: z.string().min(1, "Please select a delivery branch"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?84|0)\d{9}$/, "Please enter a valid Vietnamese phone number"),
});

const PAY_METHODS = [
  { l: "Apple Pay", s: "Touch ID · ★", color: "#000", value: "APPLE_PAY" },
  { l: "Momo wallet", s: "•••• 4421", color: "#a50064", letters: "M", value: "MOMO_WALLET" },
  { l: "Visa", s: "•••• 7011", color: "#1a1f71", letters: "VISA", value: "VISA" },
  { l: "Pay on delivery", s: "cash or QR", color: "var(--crust)", letters: "$", value: "PAY_AT_COUNTER" },
];

type Stage = "select" | "confirm";

function formatCountdown(secondsLeft: number): string {
  const s = Math.max(0, secondsLeft);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutPageInner />
    </ProtectedRoute>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const syncing = useCartStore((s) => s.syncing);
  const backendReady = useCartStore((s) => s.backendReady);
  const cartError = useCartStore((s) => s.cartError);

  const [stage, setStage] = useState<Stage>("select");
  const [payMethod, setPayMethod] = useState(3); // Default to "Pay on delivery"
  const [ordered, setOrdered] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [membership, setMembership] = useState<Membership | undefined>(undefined);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [contactPhone, setContactPhone] = useState("");
  const [fallbackAddress, setFallbackAddress] = useState("");
  const [newAddressLat, setNewAddressLat] = useState<number | undefined>(undefined);
  const [newAddressLng, setNewAddressLng] = useState<number | undefined>(undefined);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  // Branch picker (fed by findOrderBranches — server decides eligibility + fee)
  const [branchOptions, setBranchOptions] = useState<OrderBranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [missing, setMissing] = useState<OrderMissingItem[]>([]);

  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Coupon | null>(null);
  const [voucherError, setVoucherError] = useState("");

  // Stage 2: server-authoritative quote locked into a Redis session.
  const [quote, setQuote] = useState<SelectOrderBranchResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Absolute client-side deadline (ms). Anchored from the server's relative
  // ttl_seconds when the quote arrives, so the countdown is immune to
  // client/server clock skew (no comparing Date.now() to server timestamps).
  const deadlineRef = useRef<number | null>(null);

  const backendItems = useMemo(
    () => items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
    [items],
  );

  // The delivery target for find-branches / select-branch is always a *saved*,
  // selected address. The "custom" form only edits a draft (fallbackAddress +
  // map pins); branches are fetched once it's saved (which auto-selects it).
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const deliveryAddress = selectedAddress?.address ?? "";
  const lat = selectedAddress?.lat;
  const lng = selectedAddress?.lng;

  useEffect(() => {
    const hydrating = Boolean(user) && syncing;
    const awaitingFirstLoad = Boolean(user) && !backendReady && !cartError;
    if (items.length === 0 && !ordered && !(hydrating || awaitingFirstLoad)) router.replace("/menu");
  }, [items, ordered, router, syncing, backendReady, cartError, user]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setMembership(await getMembership());
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to load membership:", err);
      }
      try {
        const profile = await getMyProfile();
        if (profile.phone) setContactPhone(profile.phone);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to load profile:", err);
      }
      try {
        const addrs = await getAddresses();
        setAddresses(addrs);
        const defaultAddr = addrs.find((a) => a.is_default);
        setSelectedAddressId(defaultAddr?.id ?? addrs[0]?.id ?? "custom");
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to load addresses:", err);
      }
      try {
        setAvailableCoupons(await getAvailableCoupons());
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to load vouchers:", err);
      }
    };
    loadData();
  }, []);

  // Re-fetch eligible delivery branches whenever the address/cart changes.
  // Only relevant on the select stage.
  const noItems = backendItems.length === 0;
  useEffect(() => {
    if (stage !== "select") return;
    let cancelled = false;
    const loadBranches = async () => {
      if (noItems || !deliveryAddress.trim()) {
        setBranchOptions([]);
        setSelectedBranchId("");
        setMissing([]);
        return;
      }
      setBranchLoading(true);
      setBranchError("");
      try {
        const res = await findOrderBranches({
          shipping_address: deliveryAddress,
          shipping_latitude: lat,
          shipping_longitude: lng,
          items: backendItems,
        });
        if (cancelled) return;
        setBranchOptions(res.options);
        setMissing(res.missing);
        setSelectedBranchId((prev) =>
          res.options.some((o) => o.branch_id === prev) ? prev : res.options[0]?.branch_id ?? "",
        );
      } catch {
        if (!cancelled) {
          setBranchOptions([]);
          setBranchError("We couldn't find a branch to deliver this order to that address.");
        }
      } finally {
        if (!cancelled) setBranchLoading(false);
      }
    };
    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [stage, deliveryAddress, lat, lng, backendItems, noItems]);

  // Countdown for the locked quote (Stage 2). Counts down from a client-anchored
  // deadline (set in handleReview from ttl_seconds), so no clock-skew artifacts.
  useEffect(() => {
    if (stage !== "confirm" || deadlineRef.current == null) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stage]);

  const expired = stage === "confirm" && secondsLeft <= 0;

  if (!hydrated) return <Loading />;

  // A completed order leaves the cart empty and `ordered` sticky so the success
  // screen persists. If items reappear, the user is starting a fresh order —
  // reset the transaction state *during render* (React's recommended pattern for
  // adjusting state when an input changes) so we don't get stuck on the
  // "Order placed" screen when re-entering checkout without a full unmount.
  // deadlineRef isn't touched here: it's only read while stage === "confirm"
  // and handleReview re-anchors it before we can return to that stage.
  if (ordered && items.length > 0) {
    setOrdered(false);
    setStage("select");
    setQuote(null);
    setError("");
    return <Loading />;
  }

  if (ordered) {
    return (
      <main className="mx-auto max-w-md px-6 pt-16 pb-32 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-cinnamon font-display text-[40px] text-white">
          <span aria-hidden="true">✓</span>
        </div>
        <h1 className="font-display text-[36px] leading-[0.95] tracking-tight text-espresso">
          Order placed. <span className="font-editorial text-cinnamon">Out of the oven soon.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs font-editorial text-[14px] italic text-caramel">
          We&apos;ll text when your basket is on the way.
        </p>
        <Link
          href="/orders"
          className="bkr-press mt-8 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream"
        >
          Track my order <span aria-hidden="true">→</span>
        </Link>
      </main>
    );
  }

  if (items.length === 0) return null;

  const selectedOption = branchOptions.find((o) => o.branch_id === selectedBranchId);
  const deliveryFee = Number(selectedOption?.shipping_fee ?? 0);
  const voucherDiscount = (() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.minOrder && subtotal < appliedVoucher.minOrder) return 0;
    const raw = (subtotal * appliedVoucher.discountValue) / 100;
    return appliedVoucher.maxDiscount ? Math.min(raw, appliedVoucher.maxDiscount) : raw;
  })();
  const total = Math.max(0, subtotal + deliveryFee - voucherDiscount);

  // Inline "Other address" form → persist via /addresses, then select it.
  const saveNewAddress = async () => {
    const trimmed = fallbackAddress.trim();
    setAddressError("");
    if (!trimmed) {
      setAddressError("Please enter your delivery address.");
      return;
    }
    if (newAddressLat == null || newAddressLng == null) {
      setAddressError("Pin your spot on the map first.");
      return;
    }
    setSavingAddress(true);
    try {
      const created = await addAddress(trimmed, trimmed, {
        lat: newAddressLat,
        lng: newAddressLng,
        isDefault: addresses.length === 0,
      });
      setAddresses((current) => [...current, created]);
      setSelectedAddressId(created.id);
      setFallbackAddress("");
      setNewAddressLat(undefined);
      setNewAddressLng(undefined);
    } catch {
      setAddressError("Could not save that address. Please try again.");
    } finally {
      setSavingAddress(false);
    }
  };

  const applyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    setVoucherError("");
    if (!code) return;
    const match = availableCoupons.find((c) => c.code.toUpperCase() === code);
    if (!match) {
      setVoucherError("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
      return;
    }
    if (match.minOrder && subtotal < match.minOrder) {
      setVoucherError(`Đơn tối thiểu ${formatVND(match.minOrder)} để dùng mã này.`);
      return;
    }
    setAppliedVoucher(match);
    setVoucherInput("");
  };

  // Stage 1 → 2: lock the quote into a session via /orders/select-branch.
  const handleReview = async () => {
    const validation = checkoutSchema.safeParse({ items, branchId: selectedBranchId, phone: contactPhone });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    if (!deliveryAddress.trim()) {
      setError("Please provide a delivery address.");
      return;
    }
    setReviewing(true);
    setError("");
    try {
      const q = await selectOrderBranch({
        branch_id: selectedBranchId,
        shipping_address: deliveryAddress,
        shipping_latitude: lat,
        shipping_longitude: lng,
        contact_phone: contactPhone.trim(),
        items: backendItems,
        voucher_code: appliedVoucher?.code,
      });
      setQuote(q);
      const ttl = Number(q.ttl_seconds);
      deadlineRef.current = Date.now() + (Number.isFinite(ttl) && ttl > 0 ? ttl : 600) * 1000;
      setStage("confirm");
    } catch {
      setError("We couldn't lock in that order. Please review your details and try again.");
    } finally {
      setReviewing(false);
    }
  };

  // Stage 2 → done: place the order from the locked session.
  const handleConfirm = async () => {
    if (!quote || expired) return;
    setSubmitting(true);
    setError("");
    try {
      await confirmOrder(quote.session_id);
      clearCart();
      setOrdered(true);
    } catch {
      setError("Failed to place order. The quote may have expired — please start again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Return to the select stage to build a fresh quote.
  const handleBackToSelect = () => {
    setStage("select");
    setQuote(null);
    deadlineRef.current = null;
    setError("");
  };

  // ───────────────────────────── Stage 2: Confirm ─────────────────────────────
  if (stage === "confirm" && quote) {
    return (
      <main className="mx-auto max-w-md px-6 pt-4 pb-44 lg:pb-16">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={handleBackToSelect} className="text-[22px] text-espresso" aria-label="Back to checkout">‹</button>
          <div className="text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">step 2 / 2 · confirm</div>
            <div className="font-display text-[16px] leading-none text-espresso">Review order</div>
          </div>
          <span className="w-[22px]" aria-hidden="true" />
        </div>

        {/* Countdown */}
        <div
          className={`mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 ${
            expired ? "border-sienna/40 bg-sienna/10" : "border-cinnamon/30 bg-cinnamon/5"
          }`}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-caramel">
            {expired ? "Quote expired" : "Confirm within"}
          </span>
          <span className={`font-display text-[22px] tabular-nums ${expired ? "text-sienna" : "text-espresso"}`}>
            {formatCountdown(secondsLeft)}
          </span>
        </div>

        {expired && (
          <div role="alert" className="mb-4 rounded-2xl border border-sienna/30 bg-sienna/10 p-3 text-center">
            <p className="font-editorial text-[13px] italic text-sienna">
              This quote has expired. Please go back and review the branch and pricing again.
            </p>
            <button
              onClick={handleBackToSelect}
              className="mt-2 inline-flex rounded-full bg-espresso px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cream"
            >
              Back to checkout
            </button>
          </div>
        )}

        {/* Delivery summary */}
        <div className="mb-3 rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Delivering from</div>
          <div className="font-display text-[18px] leading-tight text-espresso">{quote.branch_name}</div>
          <div className="mt-0.5 font-editorial text-[12px] italic text-caramel">
            {typeof quote.distance_km === "number" ? `${quote.distance_km.toFixed(1)} km · ` : ""}
            to {deliveryAddress}
          </div>
        </div>

        {/* Recipient */}
        <div className="mb-3 rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Delivering to</div>
          {(user?.full_name || user?.display_name) && (
            <div className="text-[15px] font-bold text-espresso">{user.full_name ?? user.display_name}</div>
          )}
          <div className="mt-0.5 text-[13px] text-cocoa">{deliveryAddress}</div>
          {contactPhone.trim() && (
            <div className="mt-1 font-mono text-[12px] tabular-nums tracking-wide text-cocoa">{contactPhone.trim()}</div>
          )}
        </div>

        {/* Items */}
        <div className="mb-3 rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Your basket</div>
          <ul className="flex flex-col gap-1.5">
            {quote.items.map((it) => (
              <li key={it.product_id} className="flex items-baseline justify-between gap-2 text-[13px] text-espresso">
                <span className="min-w-0 truncate">
                  <span className="mr-1.5 font-mono text-[11px] font-bold tabular-nums text-cinnamon">{it.quantity}×</span>
                  {it.name}
                </span>
                <span className="shrink-0 font-mono tabular-nums">{formatVND(Number(it.line_total))}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Server-authoritative totals */}
        <div className="mb-4 rounded-2xl border border-crust bg-white p-4">
          <div className="flex justify-between py-1 text-[13px] text-cocoa">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatVND(Number(quote.subtotal))}</span>
          </div>
          {Number(quote.discount_amount) > 0 && (
            <div className="flex justify-between py-1 text-[13px] font-semibold text-cinnamon">
              <span>Voucher{quote.voucher_code ? ` · ${quote.voucher_code}` : ""}</span>
              <span className="font-mono tabular-nums">−{formatVND(Number(quote.discount_amount))}</span>
            </div>
          )}
          {Number(quote.shipping_fee) > 0 && (
            <div className="flex justify-between py-1 text-[13px] text-cocoa">
              <span>Delivery</span>
              <span className="font-mono tabular-nums">{formatVND(Number(quote.shipping_fee))}</span>
            </div>
          )}
          <div className="mt-3 flex items-end justify-between border-t border-crust pt-3">
            <span className="font-display text-[18px]">Total</span>
            <span className="font-display text-[24px] text-espresso">{formatVND(Number(quote.total))}</span>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna">
            {error}
          </p>
        )}

        <div className="fixed bottom-16 left-0 right-0 px-6 pb-3 pt-3 lg:static lg:px-0" style={{ background: "linear-gradient(180deg, transparent, var(--cream) 30%)" }}>
          <button
            onClick={handleConfirm}
            disabled={submitting || expired}
            className="bkr-press flex w-full items-center justify-between rounded-full bg-espresso px-5 py-4 font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-cream disabled:opacity-50 transition-colors hover:bg-espresso/90"
          >
            <span>{submitting ? "Placing…" : "Confirm order"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </main>
    );
  }

  // ───────────────────────────── Stage 1: Select ──────────────────────────────
  return (
    <main className="mx-auto max-w-md lg:max-w-5xl px-6 pt-4 pb-44 lg:pb-16 lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between lg:col-span-12">
        <Link href="/cart" className="text-[22px] text-espresso" aria-label="Back to cart">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">step 1 / 2 · details</div>
          <div className="font-display text-[16px] leading-none text-espresso">Checkout</div>
        </div>
        <span className="font-mono text-[11px] tracking-[0.1em] text-caramel">Help</span>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-1.5 lg:col-span-12">
        <div className="h-[3px] flex-1 rounded-sm bg-cinnamon" />
        <div className="h-[3px] flex-1 rounded-sm bg-crust" />
      </div>

      <div className="lg:col-span-7 flex flex-col gap-3">
        {/* Cart sync error */}
        {cartError && (
          <div
            role="alert"
            className="rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 font-mono text-[11px] text-sienna"
          >
            Cart sync issue: {cartError}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna"
          >
            {error}
          </p>
        )}

        {/* Delivery address */}
        <div className="rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Deliver to</div>
          <div className="flex flex-col gap-2">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => setSelectedAddressId(addr.id)}
                className={`text-left rounded-xl border p-3.5 transition-colors ${selectedAddressId === addr.id ? "border-cinnamon bg-white shadow-sm" : "border-crust bg-white hover:bg-butter/50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-espresso flex items-center gap-2">
                      <span>{addr.label}</span>
                      {addr.is_default && (
                        <span className="rounded bg-golden px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-white">Default</span>
                      )}
                    </div>
                    <div className="font-editorial text-[11.5px] italic text-caramel truncate mt-0.5">{addr.address}</div>
                  </div>
                  <span
                    className="h-[18px] w-[18px] rounded-full border-[1.5px] transition-colors shrink-0"
                    style={{
                      background: selectedAddressId === addr.id ? "var(--cinnamon)" : "transparent",
                      borderColor: selectedAddressId === addr.id ? "var(--cinnamon)" : "var(--crust-deep)",
                    }}
                  />
                </div>
              </button>
            ))}

            <div className={`rounded-xl border p-3.5 transition-colors ${selectedAddressId === "custom" ? "border-cinnamon bg-white shadow-sm" : "border-crust bg-white hover:bg-butter/50"}`}>
              <button
                type="button"
                onClick={() => setSelectedAddressId("custom")}
                className="flex items-center justify-between w-full text-left gap-3"
              >
                <div className="text-[13.5px] font-semibold text-espresso">Other Address</div>
                <span
                  className="h-[18px] w-[18px] rounded-full border-[1.5px] transition-colors shrink-0"
                  style={{
                    background: selectedAddressId === "custom" ? "var(--cinnamon)" : "transparent",
                    borderColor: selectedAddressId === "custom" ? "var(--cinnamon)" : "var(--crust-deep)",
                  }}
                />
              </button>
              {selectedAddressId === "custom" && (
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    value={fallbackAddress}
                    onChange={(e) => setFallbackAddress(e.target.value)}
                    placeholder="Enter your delivery address"
                    className="w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
                  />
                  <AddressMapPicker
                    lat={newAddressLat}
                    lng={newAddressLng}
                    onChange={(lat, lng) => {
                      setNewAddressLat(lat);
                      setNewAddressLng(lng);
                    }}
                  />
                  {addressError && (
                    <p className="font-mono text-[11px] text-sienna">{addressError}</p>
                  )}
                  <button
                    type="button"
                    onClick={saveNewAddress}
                    disabled={savingAddress}
                    className="rounded-xl bg-espresso px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-cream transition-colors hover:bg-espresso/90 disabled:opacity-50"
                  >
                    {savingAddress ? "Saving…" : "Save address"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact phone */}
        <div className="rounded-2xl border border-crust bg-white p-4">
          <label htmlFor="checkout-phone" className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
            Contact number
          </label>
          <input
            id="checkout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="e.g. 0901 234 567"
            className="w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-mono text-[14px] tracking-wide text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
          />
          <p className="mt-2 font-editorial text-[11px] italic text-caramel">
            The rider will call this number if they can&apos;t find you.
          </p>
        </div>

        {/* Branch picker */}
        <div className="rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Delivered from</div>
          {branchLoading ? (
            <div className="py-4 text-center font-editorial text-[13px] italic text-caramel">Finding nearby branches…</div>
          ) : !deliveryAddress.trim() ? (
            <div className="py-4 text-center font-editorial text-[13px] italic text-caramel">Add a delivery address to see branches.</div>
          ) : missing.length > 0 ? (
            <p className="font-mono text-[11px] text-sienna">
              Out of stock: {missing.map((m) => m.name).join(", ")}. Please update your cart.
            </p>
          ) : branchError ? (
            <p className="font-mono text-[11px] text-sienna">{branchError}</p>
          ) : branchOptions.length === 0 ? (
            <p className="font-mono text-[11px] text-sienna">No branch can deliver to this address.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {branchOptions.map((opt) => (
                <button
                  key={opt.branch_id}
                  type="button"
                  onClick={() => setSelectedBranchId(opt.branch_id)}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${selectedBranchId === opt.branch_id ? "border-cinnamon bg-white shadow-sm" : "border-crust bg-white hover:bg-butter/50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-espresso truncate">{opt.name}</div>
                      <div className="font-editorial text-[11.5px] italic text-caramel mt-0.5">
                        {typeof opt.distance_km === "number" ? `${opt.distance_km.toFixed(1)} km · ` : ""}
                        Ship {formatVND(Number(opt.shipping_fee))}
                      </div>
                    </div>
                    <span
                      className="h-[18px] w-[18px] rounded-full border-[1.5px] transition-colors shrink-0"
                      style={{
                        background: selectedBranchId === opt.branch_id ? "var(--cinnamon)" : "transparent",
                        borderColor: selectedBranchId === opt.branch_id ? "var(--cinnamon)" : "var(--crust-deep)",
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment */}
        <div>
          <div className="mb-2 mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-caramel">Pay with</div>
          <div className="flex flex-col gap-2">
            {PAY_METHODS.map((p, i) => {
              const active = i === payMethod;
              const isStub = i < 3;
              return (
                <button
                  key={p.l}
                  type="button"
                  aria-pressed={active}
                  disabled={isStub}
                  onClick={() => setPayMethod(i)}
                  className={`flex items-center gap-3 rounded-xl p-3.5 text-left transition-colors ${
                    active ? "border-2 border-cinnamon bg-white shadow-sm" : "border border-crust bg-white hover:bg-butter/50"
                  } ${isStub ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div
                    className="flex h-6 w-9 items-center justify-center rounded text-[9px] font-bold tracking-wider text-white"
                    style={{ background: p.color }}
                  >
                    {p.letters ?? ""}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold text-espresso">{p.l}</div>
                    <div className="font-mono text-[10px] tracking-[0.08em] text-caramel">{p.s}</div>
                  </div>
                  {isStub ? (
                    <span className="rounded bg-caramel/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-caramel">
                      coming soon
                    </span>
                  ) : (
                    <span
                      className="h-[18px] w-[18px] rounded-full border-[1.5px] transition-colors"
                      style={{
                        background: active ? "var(--cinnamon)" : "transparent",
                        borderColor: active ? "var(--cinnamon)" : "var(--crust-deep)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loyalty */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-1 flex w-full items-center gap-3 rounded-2xl border border-golden/30 bg-butter p-3 text-left opacity-60 cursor-not-allowed"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-honey font-display text-[15px] text-espresso" aria-hidden="true">
            ✦
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-espresso">
              <span>Crumbs redemption</span>
              <span className="rounded bg-caramel/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-caramel">
                coming soon
              </span>
            </div>
            <div className="font-editorial text-[11.5px] italic text-caramel">
              {membership?.tier ? `${membership.tier} member` : "Member"} · redemption coming soon
            </div>
          </div>
        </button>

        {/* Voucher */}
        <div className="rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
            Voucher code
          </div>
          {appliedVoucher ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-sage/40 bg-sage/10 px-3 py-2.5">
              <div>
                <div className="font-mono text-[13px] font-semibold text-espresso">
                  {appliedVoucher.code}
                </div>
                <div className="font-editorial text-[11.5px] italic text-caramel">
                  {appliedVoucher.description} · −{formatVND(voucherDiscount)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppliedVoucher(null);
                  setVoucherError("");
                }}
                className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-cinnamon"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                aria-label="Voucher code"
                className="flex-1 rounded-xl border border-crust bg-white px-3.5 py-2.5 font-mono text-[13px] uppercase tracking-wide text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
              <button
                type="button"
                onClick={applyVoucher}
                className="rounded-xl bg-espresso px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-cream transition-colors hover:bg-espresso/90"
              >
                Apply
              </button>
            </div>
          )}
          {voucherError && (
            <p className="mt-2 font-mono text-[11px] text-sienna">{voucherError}</p>
          )}
          {!appliedVoucher && availableCoupons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {availableCoupons.slice(0, 4).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setVoucherInput(c.code);
                    setVoucherError("");
                  }}
                  className="rounded-full border border-crust bg-butter px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cocoa transition-colors hover:border-cinnamon"
                >
                  {c.code}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom (mobile) / Static sticky sidebar (desktop) */}
      <div className="lg:col-span-5 lg:sticky lg:top-8 mt-8 lg:mt-0">
        <div
          className="fixed bottom-16 left-0 right-0 px-6 pb-3 pt-3 lg:static lg:p-0 lg:bg-transparent"
          style={{ background: "linear-gradient(180deg, transparent, var(--cream) 30%)" }}
        >
          <div className="hidden lg:block lg:mb-4 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.2em] lg:text-caramel">
            Order Summary
          </div>
          <div className="mb-3 rounded-2xl border border-crust bg-white p-4 shadow-sm lg:shadow-none">
            <div className="flex justify-between py-1 text-[13px] text-cocoa">
              <span>Subtotal</span>
              <span className="font-mono">{formatVND(subtotal)}</span>
            </div>
            {voucherDiscount > 0 && appliedVoucher && (
              <div className="flex justify-between py-1 text-[13px] font-semibold text-cinnamon">
                <span>Voucher · {appliedVoucher.code}</span>
                <span className="font-mono">−{formatVND(voucherDiscount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between py-1 text-[13px] text-cocoa">
                <span>Delivery</span>
                <span className="font-mono">{formatVND(deliveryFee)}</span>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between border-t border-crust pt-3">
              <span className="font-display text-[18px]">Est. total</span>
              <span className="font-display text-[24px] text-espresso">
                {formatVND(total)}
              </span>
            </div>
            <p className="mt-2 font-editorial text-[11px] italic text-caramel">
              Final total is confirmed on the next screen.
            </p>
          </div>

          <button
            onClick={handleReview}
            disabled={reviewing || !selectedBranchId || !contactPhone.trim()}
            className="bkr-press flex w-full items-center justify-between rounded-full bg-espresso px-5 py-4 font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-cream disabled:opacity-50 transition-colors hover:bg-espresso/90"
          >
            <span>{reviewing ? "Reviewing…" : "Review order"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </main>
  );
}
