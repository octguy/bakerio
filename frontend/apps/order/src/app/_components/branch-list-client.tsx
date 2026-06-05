"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { Branch } from "@repo/api-client";
import { BranchCard } from "./branch-card";
import { Link } from "next-view-transitions";
import { MenuLocationHeader } from "../menu/_components/menu-location-header";
import { useCartStore } from "@/store/cart";

const HERO_IMAGES: Record<string, string> = {
  north: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1400&q=85&auto=format",
  central: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&q=85&auto=format",
  south: "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1400&q=85&auto=format",
};

const DEFAULT_CUSTOMER_LOCATION = { lat: 10.7769, lng: 106.7009 };
const FALLBACK_DISTANCE_KM = Number.POSITIVE_INFINITY;
const ORDER_TYPES = ["Pick Up", "Delivery", "Dine In"] as const;

type OrderType = (typeof ORDER_TYPES)[number];

function distanceKm(branch: Branch, userLoc: { lat: number; lng: number } | null) {
  if (typeof branch.lat !== "number" || typeof branch.lng !== "number") {
    return FALLBACK_DISTANCE_KM;
  }
  const loc = userLoc || DEFAULT_CUSTOMER_LOCATION;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(branch.lat - loc.lat);
  const dLng = toRad(branch.lng - loc.lng);
  const lat1 = toRad(loc.lat);
  const lat2 = toRad(branch.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function distanceLabel(distance: number) {
  return Number.isFinite(distance) ? `${distance.toFixed(distance < 10 ? 1 : 0)} km` : "Nearby";
}

function etaLabel(distance: number) {
  if (!Number.isFinite(distance)) return "15–25 min";
  if (distance < 2) return "15–25 min";
  if (distance < 5) return "25–35 min";
  if (distance < 8) return "35–50 min";
  return "45–60 min";
}

function isBranchOpen(): boolean {
  return true;
}

interface Props {
  initialBranches: Branch[];
  error?: string;
  initialTransitionBranchId?: string | null;
}

export function BranchListClient({ initialBranches, error, initialTransitionBranchId = null }: Props) {
  const [search, setSearch] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("Pick Up");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const persistedSelectedBranchId = useCartStore((s) => s.selectedBranch?.id ?? null);
  // Always keep viewTransitionName on the selected branch card so the View
  // Transitions API can find its morph target on both forward and backward
  // navigations without needing a re-render first.
  const transitionSourceBranchId = initialTransitionBranchId ?? persistedSelectedBranchId;
  const [isOpeningMenu, setIsOpeningMenu] = useState(false);

  // Reset the overlay when this component unmounts (i.e., /menu has loaded
  // and Next.js removes the home page from the viewport). This ensures
  // the cached state has isOpeningMenu=false for back-navigation.
  useEffect(() => {
    if (!isOpeningMenu) return;
    return () => setIsOpeningMenu(false);
  }, [isOpeningMenu]);

  // Strip the legacy ?transitionBranch= param from the URL once we've used it
  // for the reverse morph. We use history.replaceState (not router.replace) so
  // we don't re-render the route or add a history entry — the param is purely
  // a render-time hint to BranchListClient, never meant to persist in the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.includes("transitionBranch")) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);
  // const selectedBranchId = useCartStore((s) => s.selectedBranch?.id ?? s.branchId); // retained for potential future use

  // Next.js hydration safety - recalculate open status on client
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  }, []);

  const handleReturnToBranches = useCallback(() => {
    const showBranchList = () => flushSync(() => setIsOpeningMenu(false));

    if ("startViewTransition" in document) {
      document.startViewTransition(showBranchList);
      return;
    }
    showBranchList();
  }, []);

  const rankedBranches = useMemo(() => {
    let filtered = initialBranches;
    
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q)
      );
    }
    
    if (openNow && mounted) {
      filtered = filtered.filter(isBranchOpen);
    }

    return filtered
      .map((branch) => ({ branch, distance: distanceKm(branch, location) }))
      .sort((a, b) => a.distance - b.distance);
  }, [initialBranches, location, search, openNow, mounted]);

  const openCount = mounted ? initialBranches.filter(isBranchOpen).length : initialBranches.length;

const recommendedBranchId = useMemo(() => {
      if (rankedBranches.length === 0) {
        return null;
      }
      // Always recommend the closest (first) ranked branch, regardless of selected/clicked branch
      return rankedBranches[0].branch.id;
    }, [rankedBranches]);

  const recommendedBranch = useMemo(() => {
    if (!recommendedBranchId) {
      return null;
    }

    return rankedBranches.find(({ branch }) => branch.id === recommendedBranchId)?.branch ?? null;
  }, [rankedBranches, recommendedBranchId]);

  if (isOpeningMenu) {
    return (
      <div className="absolute inset-0 z-50 isolate min-h-screen overflow-x-clip bg-vanilla px-4 pt-3 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-16 xl:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_58%,#f4dfbd_100%)]" />
        <div className="mx-auto flex w-full max-w-[1520px] flex-col lg:items-start">
          <section className="min-w-0 w-full lg:pt-2">
            <MenuLocationHeader onChangeBranch={handleReturnToBranches} />
            <div className="py-12 text-center font-editorial text-[14.5px] italic text-caramel">Opening today&apos;s batch...</div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-crust bg-white px-4 py-3.5 text-[14px] font-semibold text-espresso placeholder-cocoa focus:border-espresso focus:outline-none focus:ring-1 focus:ring-espresso transition-colors"
          />
        </div>
        
        {/* Filters & Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setOpenNow((prev) => !prev)}
            aria-pressed={openNow}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3.5 text-[13px] font-semibold transition-colors ${
              openNow
                ? "border-sage bg-sage/10 text-sage"
                : "border-crust bg-white text-espresso hover:bg-crust/30"
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${openNow ? "bg-sage bkr-pulse" : "bg-cocoa"}`} />
            Open Now
          </button>

          <button
            onClick={handleUseLocation}
            disabled={isLocating}
            className="flex items-center gap-2 rounded-2xl border border-crust bg-white px-4 py-3.5 text-[13px] font-semibold text-espresso hover:bg-crust/30 transition-colors disabled:opacity-50"
            aria-label="Use my location"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isLocating ? "animate-pulse" : ""}>
              <circle cx="12" cy="10" r="3" />
              <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
            </svg>
            <span className="hidden sm:inline">Use Location</span>
          </button>
        </div>
      </div>

      {/* Order type selection */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          role="radiogroup"
          aria-label="Order type"
          className="grid w-full grid-cols-3 overflow-hidden rounded-2xl border border-crust bg-white p-1 shadow-[inset_0_0_0_1px_rgba(74,44,31,0.04)] sm:flex-1"
        >
          {ORDER_TYPES.map((label) => {
            const isActive = orderType === label;

            return (
              <label
                key={label}
className={`relative min-w-0 cursor-pointer rounded-xl px-2 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] transition-colors sm:text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream ${
                      isActive
                        ? "bg-espresso font-bold text-cream shadow-sm"
                        : "text-caramel hover:bg-crust/35 hover:text-espresso"
                    }`}
              >
                <input
                  type="radio"
                  name="orderType"
                  value={label}
                  checked={isActive}
                  onChange={() => setOrderType(label)}
                  className="peer sr-only"
                />
                <span className="block truncate rounded-[inherit] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cream">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        <div className="whitespace-nowrap font-mono text-[11px] tracking-[0.12em] text-caramel sm:px-1 sm:text-right">
          {openCount} open
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-xl border border-sienna/30 bg-sienna/10 px-4 py-3 text-center">
          <p className="font-mono text-[11px] tracking-wider text-sienna">{error}</p>
          <Link
            href="/"
            className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cinnamon"
          >
            Retry
          </Link>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {rankedBranches.length === 0 && mounted ? (
          <div className="col-span-full py-12 text-center">
            <p className="font-editorial text-[18px] text-caramel">No branches found matching your criteria.</p>
          </div>
        ) : (
          rankedBranches.map(({ branch, distance }) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isSelected={branch.id === recommendedBranchId}
              heroImage={HERO_IMAGES.south}
              distanceLabel={distanceLabel(distance)}
              etaLabel={etaLabel(distance)}
              isTransitionSource={branch.id === transitionSourceBranchId}
              onTransitionStart={() => setIsOpeningMenu(true)}
            />
          ))
        )}
      </div>

      {/* Continue CTA */}
      {rankedBranches.length > 0 && (
        <div
          className="sticky bottom-16 md:bottom-0 z-40 -mx-6 px-6 pb-4 pt-6 backdrop-blur-[6px]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(253, 248, 243, 0.75) 30%, var(--cream) 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
          }}
        >
          <div className="text-center font-editorial text-[13px] text-caramel">
            52 items baked fresh at {recommendedBranch?.name?.split(" ")[0] ?? "Lê Lợi"} this morning.
          </div>
        </div>
      )}
    </>
  );
}
