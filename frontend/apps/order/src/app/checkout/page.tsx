"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { Link } from "next-view-transitions";
import { z } from "zod";
import {
  confirmOrder,
  findOrderBranches,
  getMockOrderSessionUser,
  selectOrderBranch,
  type CreateOrderRequest,
} from "@repo/api-client";
import { getLoyalty, maxRedeemableFor, redeemCrumbs } from "@repo/api-client/mock/loyalty";
import type { LoyaltyBalance } from "@repo/api-client/mock/loyalty";
import { getAddresses } from "@repo/api-client";
import type { SavedAddress } from "@repo/api-client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth";
import { useCartStore } from "@/store/cart";
import { useOrderDetailsStore } from "@/store/orderDetails";
import { formatVND } from "@/lib/format";
import Loading from "./loading";

const checkoutSchema = z.object({
  items: z.array(z.any()).min(1, "Cart cannot be empty"),
  branchId: z.string().min(1, "No branch selected"),
});

const TIMES = [
  { l: "ASAP", s: "15–25m" },
  { l: "07:30", s: "today" },
  { l: "08:00", s: "today" },
  { l: "08:30", s: "today" },
  { l: "09:00", s: "today" },
];

const PAY_METHODS = [
  { l: "Apple Pay", s: "Touch ID · ★", color: "#000", value: "APPLE_PAY" },
  { l: "Momo wallet", s: "•••• 4421", color: "#a50064", letters: "M", value: "MOMO_WALLET" },
  { l: "Visa", s: "•••• 7011", color: "#1a1f71", letters: "VISA", value: "VISA" },
  { l: "Pay at counter", s: "cash or QR", color: "var(--crust)", letters: "$", value: "PAY_AT_COUNTER" },
];

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
  const branchId = useCartStore((s) => s.branchId);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const syncing = useCartStore((s) => s.syncing);
  const backendReady = useCartStore((s) => s.backendReady);
  const cartError = useCartStore((s) => s.cartError);

  const [mode, setMode] = useState<"Pickup" | "Delivery">("Pickup");
  const [selectedTime, setSelectedTime] = useState(0);
  const [payMethod, setPayMethod] = useState(3); // Default to "Pay at counter"
  const [useCrumbs, setUseCrumbs] = useState(true);
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [loyalty, setLoyalty] = useState<LoyaltyBalance | undefined>(undefined);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [fallbackAddress, setFallbackAddress] = useState("");

  useEffect(() => {
    const hydrating = Boolean(user) && syncing;
    const awaitingFirstLoad = Boolean(user) && !backendReady && !cartError;
    if (items.length === 0 && !ordered && !(hydrating || awaitingFirstLoad)) router.replace("/menu");
  }, [items, ordered, router, syncing, backendReady, cartError, user]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const bal = await getLoyalty();
        setLoyalty(bal);
        const disc = await maxRedeemableFor(subtotal);
        setMaxDiscount(disc);
        
        const addrs = await getAddresses();
        setAddresses(addrs);
        const defaultAddr = addrs.find(a => a.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (addrs.length > 0) {
          setSelectedAddressId(addrs[0].id);
        } else {
          setSelectedAddressId("custom");
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load checkout data:", err);
        }
      }
    };
    loadData();
  }, [subtotal]);


  if (!hydrated) return <Loading />;

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
          We&apos;ll text when your basket is ready.
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

  if (!branchId) {
    return (
      <main className="mx-auto max-w-md px-6 pt-16 pb-32 text-center">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">Pickup branch</div>
        <h1 className="font-display text-[36px] leading-[0.95] tracking-tight text-espresso">
          Choose where <span className="font-editorial text-cinnamon">we bake.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs font-editorial text-[14px] italic text-caramel">
          Select a branch before checkout so pickup time and availability stay accurate.
        </p>
        <Link
          href="/"
          className="bkr-press mt-8 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream"
        >
          Select branch <span aria-hidden="true">→</span>
        </Link>
      </main>
    );
  }

  const crumbsDiscount = useCrumbs ? maxDiscount : 0;
  const potentialCrumbsNeeded = useCrumbs ? Math.ceil(maxDiscount / 50) : 0;
  const deliveryFee = mode === "Delivery" ? 30000 : 0;
  const total = Math.max(0, subtotal + deliveryFee - crumbsDiscount);
  const selectedRequestedTime = TIMES[selectedTime] ?? TIMES[0];
  const selectedPaymentMethod = PAY_METHODS[payMethod] ?? PAY_METHODS[3];
  const deliveryAddress =
    mode === "Pickup"
      ? "42 Lê Lợi, Bến Nghé, Quận 1, HCMC (Pickup)"
      : (selectedAddressId === "custom" ? fallbackAddress : addresses.find((a) => a.id === selectedAddressId)?.address || "");

  const handlePlaceOrder = async () => {
    const validation = checkoutSchema.safeParse({ items, branchId });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    if (mode === "Delivery" && !deliveryAddress.trim()) {
      setError("Please provide a delivery address.");
      return;
    }
    setSubmitting(true);
    try {
      const confirmedOrder: CreateOrderRequest = {
        branch_id: branchId!,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        fulfillment_mode: mode === "Delivery" ? "DELIVERY" : "PICKUP",
        delivery_address: deliveryAddress,
        requested_time: `${selectedRequestedTime.l} · ${selectedRequestedTime.s}`,
        payment_method: selectedPaymentMethod.value,
        delivery_fee_amount: deliveryFee,
        loyalty_discount_amount: crumbsDiscount,
        crumbs_redeemed: potentialCrumbsNeeded,
        subtotal_amount: subtotal,
        total_amount: total,
      };

      const backendItems = confirmedOrder.items;
      const shippingAddress = confirmedOrder.delivery_address || "Pickup";
      const preview = await findOrderBranches({
        shipping_address: shippingAddress,
        items: backendItems,
      });
      if (preview.missing.length > 0) {
        const missing = preview.missing.map((item) => item.name).join(", ");
        setError(`Some items are unavailable: ${missing}`);
        return;
      }
      if (!preview.options.some((option) => option.branch_id === confirmedOrder.branch_id)) {
        setError("Selected branch can no longer fulfill this cart. Please pick another branch.");
        return;
      }

      // Place the order first. If this fails, the customer keeps their crumbs.
      // Redeeming before the order creates a money-out-no-goods race when the
      // backend call fails.
      const quote = await selectOrderBranch({
        branch_id: confirmedOrder.branch_id,
        shipping_address: shippingAddress,
        note: confirmedOrder.note,
        items: backendItems,
      });
      const order = await confirmOrder(quote.session_id);
      
      // Save rich details locally keyed by order id and scoped by session user
      const sessionUser = getMockOrderSessionUser();
      if (order && order.id) {
        useOrderDetailsStore.getState().saveOrderDetail(sessionUser, order.id, {
          fulfillment_mode: confirmedOrder.fulfillment_mode,
          delivery_address: confirmedOrder.delivery_address,
          requested_time: confirmedOrder.requested_time,
          payment_method: confirmedOrder.payment_method,
          delivery_fee_amount: confirmedOrder.delivery_fee_amount,
          loyalty_discount_amount: confirmedOrder.loyalty_discount_amount,
          crumbs_redeemed: confirmedOrder.crumbs_redeemed,
          subtotal_amount: confirmedOrder.subtotal_amount,
          total_amount: confirmedOrder.total_amount,
          note: confirmedOrder.note,
          items: order.items || [],
        });
      }
      if (useCrumbs && potentialCrumbsNeeded > 0) {
        try {
          await redeemCrumbs(potentialCrumbsNeeded);
        } catch (err) {
          // Order is already placed — log and continue so the customer isn't
          // blocked at the success screen. Loyalty can be reconciled async.
          if (process.env.NODE_ENV !== "production") {
            console.error("Failed to redeem crumbs after order placement:", err);
          }
        }
      }
      clearCart();
      setOrdered(true);
    } catch {
      setError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-md lg:max-w-5xl px-6 pt-4 pb-44 lg:pb-16 lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between lg:col-span-12">
        <Link href="/cart" className="text-[22px] text-espresso" aria-label="Back to cart">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">step 3 / 3</div>
          <div className="font-display text-[16px] leading-none text-espresso">Checkout</div>
        </div>
        <span className="font-mono text-[11px] tracking-[0.1em] text-caramel">Help</span>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-1.5 lg:col-span-12">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-[3px] flex-1 rounded-sm bg-cinnamon" />
        ))}
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

        {/* Mode toggle */}
        <div className="flex rounded-full bg-butter p-1">
          {(["Pickup", "Delivery"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={mode === tab}
              onClick={() => setMode(tab)}
              className={`flex-1 rounded-full py-2.5 text-center text-[13px] font-bold tracking-wide transition-colors ${
                mode === tab ? "bg-espresso text-white" : "text-cocoa"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Location card */}
        <div className="rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
            {mode === "Pickup" ? "Pickup at" : "Deliver to"}
          </div>
          
          {mode === "Pickup" ? (
            <>
              <div className="font-display text-[22px] leading-[1.05] tracking-tight text-espresso">
                Lê Lợi Flagship
              </div>
              <div className="mt-0.5 font-editorial text-[13px] text-cinnamon">
                42 Lê Lợi, Q.1 — 0.8 km
              </div>
              <div className="mt-3 flex items-center gap-2.5 text-[12px] text-cocoa">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-sage">● OPEN</span>
                <span className="font-mono text-[11px] text-caramel">06–22</span>
                <span className="ml-auto font-mono text-[11px] font-bold tracking-[0.16em] text-cinnamon">
                  CHANGE
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {addresses.map(addr => (
                <button 
                  key={addr.id}
                  type="button"
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${selectedAddressId === addr.id ? 'border-cinnamon bg-white shadow-sm' : 'border-crust bg-white hover:bg-butter/50'}`}
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
              
              <div className={`rounded-xl border p-3.5 transition-colors ${selectedAddressId === 'custom' ? 'border-cinnamon bg-white shadow-sm' : 'border-crust bg-white hover:bg-butter/50'}`}>
                <button 
                  type="button" 
                  onClick={() => setSelectedAddressId("custom")}
                  className="flex items-center justify-between w-full text-left gap-3"
                >
                  <div className="text-[13.5px] font-semibold text-espresso">Other Address</div>
                  <span
                    className="h-[18px] w-[18px] rounded-full border-[1.5px] transition-colors shrink-0"
                    style={{
                      background: selectedAddressId === 'custom' ? "var(--cinnamon)" : "transparent",
                      borderColor: selectedAddressId === 'custom' ? "var(--cinnamon)" : "var(--crust-deep)",
                    }}
                  />
                </button>
                {selectedAddressId === 'custom' && (
                  <div className="mt-3">
                    <input
                      value={fallbackAddress}
                      onChange={(e) => setFallbackAddress(e.target.value)}
                      placeholder="Enter your delivery address"
                      className="w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* When */}
        <div className="rounded-2xl border border-crust bg-white p-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">When?</div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 scrollbar-hide">
            {TIMES.map((s, i) => {
              const active = i === selectedTime;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedTime(i)}
                  className={`min-w-[78px] flex-shrink-0 rounded-lg px-3 py-2 text-center transition-colors ${
                    active ? "bg-espresso text-white" : "border border-crust bg-butter text-espresso"
                  }`}
                >
                  <div className="font-display text-[16px]">{s.l}</div>
                  <div className="font-mono text-[9.5px] tracking-[0.1em] opacity-80">{s.s}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment */}
        <div>
          <div className="mb-2 mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-caramel">Pay with</div>
          <div className="flex flex-col gap-2">
            {PAY_METHODS.map((p, i) => {
              const active = i === payMethod;
              const isStub = i < 3;
              const label = p.value === "PAY_AT_COUNTER" && mode === "Delivery" ? "Pay on delivery" : p.l;
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
                    <div className="text-[13.5px] font-semibold text-espresso">{label}</div>
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
          aria-pressed={useCrumbs}
          onClick={() => setUseCrumbs((s) => !s)}
          className="mt-1 flex w-full items-center gap-3 rounded-2xl border border-golden/30 bg-butter p-3 text-left transition-colors hover:bg-butter/80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-honey font-display text-[15px] text-espresso" aria-hidden="true">
            ✦
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-espresso">
              Use {potentialCrumbsNeeded} crumbs (−{formatVND(crumbsDiscount)})
            </div>
            <div className="font-editorial text-[11.5px] italic text-caramel">
              You have {loyalty?.balance.toLocaleString() ?? "1,420"} in your jar.
            </div>
          </div>
          <div
            className="relative h-[22px] w-[36px] rounded-full transition-colors"
            style={{ background: useCrumbs ? "var(--sage)" : "var(--crust-deep)" }}
          >
            <div
              className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all"
              style={{ left: useCrumbs ? "16px" : "2px" }}
            />
          </div>
        </button>

        {error && (
          <p className="mt-2 rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna">
            {error}
          </p>
        )}
      </div>

      {/* Sticky bottom (mobile) / Static sticky sidebar (desktop) */}
      <div className="lg:col-span-5 lg:sticky lg:top-8 mt-8 lg:mt-0">
        <div
          className="fixed bottom-16 left-0 right-0 px-6 pb-3 pt-3 lg:static lg:p-0 lg:bg-transparent"
          style={{ background: "linear-gradient(180deg, transparent, var(--cream) 30%)" }}
        >
          {/* We only need the gradient wrapper on mobile. Let's make it more responsive. */}
          <div className="hidden lg:block lg:mb-4 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.2em] lg:text-caramel">
            Order Summary
          </div>
          <div className="mb-3 rounded-2xl border border-crust bg-white p-4 shadow-sm lg:shadow-none">
            <div className="flex justify-between py-1 text-[13px] text-cocoa">
              <span>Subtotal</span>
              <span className="font-mono">{formatVND(subtotal)}</span>
            </div>
            {crumbsDiscount > 0 && (
              <div className="flex justify-between py-1 text-[13px] font-semibold text-sage">
                <span>Crumbs · {potentialCrumbsNeeded}</span>
                <span className="font-mono">−{formatVND(crumbsDiscount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between py-1 text-[13px] text-cocoa">
                <span>Delivery</span>
                <span className="font-mono">{formatVND(deliveryFee)}</span>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between border-t border-crust pt-3">
              <span className="font-display text-[18px]">Total</span>
              <span className="font-display text-[24px] text-espresso">
                {formatVND(total)}
              </span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="bkr-press flex w-full items-center justify-between rounded-full bg-espresso px-5 py-4 font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-cream disabled:opacity-50 transition-colors hover:bg-espresso/90"
          >
            <span>
              {submitting 
                ? "Placing…" 
                : (selectedPaymentMethod.value === "PAY_AT_COUNTER" && mode === "Delivery" 
                    ? "Pay on delivery" 
                    : `Pay with ${PAY_METHODS[payMethod].l}`)}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </main>
  );
}
