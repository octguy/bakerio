"use client";

import { Link } from "next-view-transitions";
import { useCartStore } from "@/store/cart";

export function MenuLocationHeader() {
  const branch = useCartStore((s) => s.selectedBranch);

  return (
    <Link
      href="/"
      aria-label={branch ? `Change branch — currently ${branch.name}` : "Choose a branch"}
      className="bkr-press mb-4 flex min-h-14 items-center gap-3 rounded-[1.35rem] border border-crust-deep bg-white/92 px-3.5 py-3 shadow-[0_18px_45px_-35px_rgba(44,24,16,0.75)] sm:px-4 lg:rounded-[1.75rem] lg:px-5 lg:py-4"
      // Shares the tapped card's name so it morphs up from that card.
      style={branch ? { viewTransitionName: "selected-branch" } : undefined}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-espresso text-[18px] text-cream shadow-sm lg:h-10 lg:w-10">
        ‹
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-caramel lg:text-[10px]">pickup at</div>
        <div className="truncate font-display text-[17px] leading-none text-espresso lg:text-[22px]">
          {branch?.name ?? "Choose a branch"}
        </div>
      </div>
      {branch && (
        <div className="flex-shrink-0 rounded-2xl bg-butter/70 px-3 py-2 text-right">
          <div className="font-mono text-[10px] text-cocoa">{branch.dist}</div>
          <div className="font-mono text-[10px] font-semibold text-cinnamon">{branch.eta}</div>
        </div>
      )}
    </Link>
  );
}
