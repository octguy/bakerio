"use client";

import Image from "next/image";
import { useEffect } from "react";
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
  // Exactly one card matches the store, so only the tapped card claims the
  // shared morph name — no duplicate view-transition-name across the page.
  const isMorphing = useCartStore((s) => s.selectedBranch?.id === branch.id);

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
    flushSync(() =>
      selectBranch({ id: branch.id, name: branch.name, address: branch.address, dist: distanceLabel, eta: etaLabel }),
    );
    router.push("/menu");
  };

  return (
    <button
      onClick={handleSelect}
      aria-label={branch.name}
      style={{ minHeight: 100, viewTransitionName: isMorphing ? "selected-branch" : undefined }}
      className={`relative flex w-full overflow-hidden rounded-2xl text-left transition-colors transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
        isSelected ? "border-2 border-espresso bg-white" : "border border-crust bg-white"
      }`}
    >
      <div
        className="relative h-[100px] w-[100px] flex-shrink-0"
        style={{ height: 100, width: 100 }}
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
        <span className="absolute right-0 top-0 rounded-bl-[12px] bg-espresso px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-cream">
          ✓ Recommended
        </span>
      )}
    </button>
  );
}
