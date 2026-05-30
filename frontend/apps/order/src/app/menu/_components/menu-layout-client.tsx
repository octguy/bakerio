"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { motion } from "framer-motion";

export function MenuLayoutClient({
  featureSection,
  catalogSection,
}: {
  featureSection: React.ReactNode;
  catalogSection: React.ReactNode;
}) {
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isStacked = (hydrated && isCartOpen) || isScrolled;

  return (
    <motion.div
      layout
      data-stacked={isStacked}
      transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      className={`group/menu mx-auto flex w-full max-w-[1520px] gap-4 lg:items-start xl:gap-5 ${
        isStacked ? "flex-col" : "flex-col min-[1440px]:flex-row"
      }`}
    >
      <motion.section
        layout
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className={`bkr-rise min-w-0 ${
          isStacked
            ? "w-full"
            : "min-[1440px]:sticky min-[1440px]:top-8 min-[1440px]:w-[400px] min-[1440px]:shrink-0 2xl:w-[460px]"
        }`}
      >
        {featureSection}
      </motion.section>

      <motion.section
        layout
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className={`bkr-rise-1 min-w-0 lg:pt-2 ${
          isStacked ? "w-full" : "min-[1440px]:flex-1"
        }`}
      >
        {catalogSection}
      </motion.section>
    </motion.div>
  );
}
