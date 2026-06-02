"use client";

import { useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { useCartStore } from "@/store/cart";

export function MenuLocationHeader() {
  const router = useTransitionRouter();
  const branch = useCartStore((s) => s.selectedBranch);
  const [isReturning, setIsReturning] = useState(false);

  const handleChangeBranch = () => {
    setIsReturning(true);
    requestAnimationFrame(() => router.push("/"));
  };

  return (
    <>
      {isReturning && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-cream/95 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-cinnamon/20" />
            <div className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-cinnamon">
              Opening branches
            </div>
            <div className="mt-2 font-editorial text-[14px] italic text-caramel">
              Clearing the counter...
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleChangeBranch}
        aria-label={branch ? `Change branch — currently ${branch.name}` : "Choose a branch"}
        className="bkr-press mb-4 flex min-h-14 w-full items-center gap-3 rounded-[1.35rem] border border-crust-deep bg-white/92 px-3.5 py-3 text-left shadow-[0_18px_45px_-35px_rgba(44,24,16,0.75)] sm:px-4 lg:rounded-[1.75rem] lg:px-5 lg:py-4"
        // Always keep the destination morph target mounted, including loading and
        // pre-persist hydration frames where branch details may not be available.
        style={{ viewTransitionName: "selected-branch" }}
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
      </button>
    </>
  );
}
