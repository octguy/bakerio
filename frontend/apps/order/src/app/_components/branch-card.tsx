"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTransitionRouter } from "next-view-transitions";
import { useCartStore } from "@/store/cart";
import type { Branch } from "@repo/api-client";

interface Props {
  branch: Branch;
  isSelected: boolean;
  heroImage: string;
  distanceLabel: string;
  etaLabel: string;
}

const regionTags: Record<string, string> = {
  south: "Coffee bar",
};

export function BranchCard({ branch, isSelected, heroImage, distanceLabel, etaLabel }: Props) {
  const router = useTransitionRouter();
  const selectBranch = useCartStore((s) => s.selectBranch);
  const [isTransitionSource, setIsTransitionSource] = useState(false);
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
    // flushSync so this card carries `selected-branch` in the DOM *before* the
    // view-transition snapshot is taken; then navigate (the menu header shares
    // the same name, so the snapshot morphs card -> header).
    flushSync(() => {
      setIsTransitionSource(true);
      selectBranch({ id: branch.id, name: branch.name, address: branch.address, dist: distanceLabel, eta: etaLabel });
    });
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
