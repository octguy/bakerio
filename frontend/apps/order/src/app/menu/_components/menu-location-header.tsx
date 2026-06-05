"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";

const FROM_BRANCH_LIST_FLAG = "bkr:cameFromBranchList";

export function MenuLocationHeader({ onChangeBranch }: { onChangeBranch?: (href: string) => void }) {
  const router = useRouter();
  const branch = useCartStore((s) => s.selectedBranch);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  const handleChangeBranch = () => {
    if (onChangeBranch) {
      onChangeBranch("/");
      return;
    }

    const cameFromBranchList =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(FROM_BRANCH_LIST_FLAG) === "1";

    if (cameFromBranchList) {
      window.sessionStorage.removeItem(FROM_BRANCH_LIST_FLAG);
      // Remove the viewTransitionName before back-nav so the auto popstate
      // transition from next-view-transitions does a simple cross-fade
      // instead of trying to morph (which breaks on repeated navigations).
      if (buttonRef.current) {
        buttonRef.current.style.viewTransitionName = "none";
      }
      router.back();
      return;
    }

    if ("startViewTransition" in document) {
      document.startViewTransition(() => router.push("/"));
      return;
    }
    router.push("/");
  };

  return (
      <button
        ref={buttonRef}
        type="button"
        onClick={handleChangeBranch}
        aria-label={branch ? `Change branch — currently ${branch.name}` : "Choose a branch"}
        className="bkr-press mb-4 flex min-h-14 w-full items-center gap-3 rounded-[1.35rem] border border-crust-deep bg-white/92 px-3.5 py-3 text-left shadow-[0_18px_45px_-35px_rgba(44,24,16,0.75)] sm:px-4 lg:rounded-[1.75rem] lg:px-5 lg:py-4"
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
  );
}
