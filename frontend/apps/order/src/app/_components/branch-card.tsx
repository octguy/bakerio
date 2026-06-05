"use client";

import Image from "next/image";
import { useEffect } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import type { Branch } from "@repo/api-client";

interface Props {
  branch: Branch;
  isSelected: boolean;
  heroImage: string;
  distanceLabel: string;
  etaLabel: string;
  isTransitionSource: boolean;
  onTransitionSource: (branchId: string | null) => void;
  onTransitionStart: () => void;
}

const regionTags: Record<string, string> = {
  south: "Coffee bar",
};

export function BranchCard({ branch, isSelected, heroImage, distanceLabel, etaLabel, isTransitionSource, onTransitionSource, onTransitionStart }: Props) {
  const router = useRouter();
  const selectBranch = useCartStore((s) => s.selectBranch);
  // Only the tapped card carries the shared morph name during navigation,
  // guaranteeing the view-transition-name stays unique across the page.

  const tag = regionTags.south;

  // Warm the /menu segment (incl. its header-bearing loading.tsx) so the tap
  // commits straight to it instead of flashing the root loading template,
  // which has no morph target and would cancel the transition.
  useEffect(() => {
    router.prefetch("/menu");
  }, [router]);

  const handleSelect = () => {
    flushSync(() => {
      onTransitionSource(branch.id);
      selectBranch({ id: branch.id, name: branch.name, address: branch.address, dist: distanceLabel, eta: etaLabel });
    });

    // Mark this navigation so the menu's back button can safely pop history
    // instead of pushing a new entry (which polluted the URL with
    // ?transitionBranch= and forced users to press back twice).
    try {
      window.sessionStorage.setItem("bkr:cameFromBranchList", "1");
    } catch {}

    const showMenuShell = () => flushSync(() => {
      onTransitionSource(null);
      onTransitionStart();
    });

    if ("startViewTransition" in document) {
      const transition = document.startViewTransition(showMenuShell);
      transition.ready.finally(() => router.push("/menu"));
      return;
    }

    showMenuShell();
    router.prefetch("/menu");
    router.push("/menu");
  };

  return (
    <button
      onClick={handleSelect}
      onPointerEnter={() => router.prefetch("/menu")}
      onFocus={() => router.prefetch("/menu")}
      aria-label={isSelected ? `${branch.name}, recommended` : branch.name}
      style={{ minHeight: 100, viewTransitionName: isTransitionSource ? "selected-branch" : undefined }}
className={`relative flex w-full items-stretch rounded-2xl border-2 bg-white text-left transition-colors transition-transform hover:-translate-y-0.5 active:scale-[0.98] ${
            isSelected ? "border-espresso" : "border-crust"
          }`}
    >
      <div
        className="relative min-h-[100px] w-[100px] flex-shrink-0 self-stretch overflow-hidden rounded-l-[14px]"
        style={{ width: 100 }}
      >
        <Image
          src={heroImage}
          alt={branch.name}
          fill
          className="pointer-events-none object-cover"
          sizes="100px"
        />
        {tag && (
          <span className="absolute left-2 top-2 rounded-full bg-cream px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-cinnamon">
            ★ {tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between px-3.5 py-3">
        <div>
          <h2 className="font-display text-[18px] leading-[1.05] tracking-tight text-espresso">
            {branch.name}
          </h2>
          <p className="mt-0.5 font-editorial text-[12px] text-cinnamon">
            {branch.address}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-sage">
            <span className="bkr-pulse inline-block h-1.5 w-1.5 rounded-full bg-sage" />{" "}
            Open
          </span>
          <span className="font-mono text-[10px] text-cocoa">{distanceLabel}</span>
          <span className="font-mono text-[10px] text-caramel">· {etaLabel}</span>
        </div>
      </div>
      {isSelected && (
        <span className="pointer-events-none absolute right-3 top-0 z-10 -translate-y-1/2 rounded-full border border-espresso bg-white px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-espresso">
          ✓ Recommended
        </span>
      )}
    </button>
  );
}
