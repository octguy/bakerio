"use client";

import { Link } from "next-view-transitions";
import { useCartStore } from "@/store/cart";

export function MenuLocationHeader() {
  const branch = useCartStore((s) => s.selectedBranch);

  return (
    <Link
      href="/"
      aria-label={branch ? `Change branch — currently ${branch.name}` : "Choose a branch"}
      className="bkr-press mb-4 flex items-center gap-3 rounded-2xl border border-crust bg-white px-4 py-3"
      // Shares the tapped card's name so it morphs up from that card.
      style={branch ? { viewTransitionName: "selected-branch" } : undefined}
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-butter text-[18px] text-espresso">
        ‹
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">pickup at</div>
        <div className="truncate font-display text-[16px] leading-none text-espresso">
          {branch?.name ?? "Choose a branch"}
        </div>
      </div>
      {branch && (
        <div className="flex-shrink-0 text-right">
          <div className="font-mono text-[10px] text-cocoa">{branch.dist}</div>
          <div className="font-mono text-[10px] font-semibold text-cinnamon">{branch.eta}</div>
        </div>
      )}
    </Link>
  );
}
