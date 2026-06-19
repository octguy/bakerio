"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface MenuPaginationProps {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isPageLoading: boolean;
  onGoToPage: (page: number) => void;
}

export default function MenuPagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  isPageLoading,
  onGoToPage,
}: MenuPaginationProps) {
  const t = useTranslations("menu");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <nav
      aria-label="Menu pagination"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-fit max-w-[calc(100vw-2rem)] bg-cream/60 backdrop-blur-md border border-crust rounded-full shadow-md py-2 px-3 flex items-center justify-center gap-2"
    >
      {/* First */}
      <button
        onClick={() => onGoToPage(1)}
        disabled={!hasPreviousPage || isPageLoading}
        aria-label="First page"
        className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
          hasPreviousPage
            ? "border border-espresso text-espresso hover:bg-espresso hover:text-white"
            : "pointer-events-none border border-crust text-caramel opacity-45"
        }`}
      >
        First
      </button>
      {/* Prev */}
      <button
        onClick={() => onGoToPage(page - 1)}
        disabled={!hasPreviousPage || isPageLoading}
        aria-label="Previous page"
        className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
          hasPreviousPage
            ? "border border-espresso text-espresso hover:bg-espresso hover:text-white"
            : "pointer-events-none border border-crust text-caramel opacity-45"
        }`}
      >
        {t("prev")}
      </button>
      {/* Page Input */}
      <input
        type="number"
        min={1}
        max={totalPages}
        value={page}
        disabled={isPageLoading}
        onChange={(e) => {
          const p = Number(e.target.value);
          if (!Number.isFinite(p)) return;
          const clamped = Math.min(Math.max(p, 1), totalPages);
          onGoToPage(clamped);
        }}
        className="w-12 text-center border rounded-md px-2 py-1 font-mono text-[10px]"
        aria-label="Page number"
      />
      <span className="font-editorial text-[13px] italic text-caramel">
        of {totalPages}
      </span>
      {/* Next */}
      <button
        onClick={() => onGoToPage(page + 1)}
        disabled={!hasNextPage || isPageLoading}
        aria-label="Next page"
        className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
          hasNextPage
            ? "border border-espresso bg-espresso text-white hover:bg-cinnamon"
            : "pointer-events-none border border-crust text-caramel opacity-45"
        }`}
      >
        {t("next")}
      </button>
      {/* Last */}
      <button
        onClick={() => onGoToPage(totalPages)}
        disabled={!hasNextPage || isPageLoading}
        aria-label="Last page"
        className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
          hasNextPage
            ? "border border-espresso text-espresso hover:bg-espresso hover:text-white"
            : "pointer-events-none border border-crust text-caramel opacity-45"
        }`}
      >
        Last
      </button>
    </nav>,
    document.body
  );
}
