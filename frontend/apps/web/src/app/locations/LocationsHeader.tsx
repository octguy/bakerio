"use client";

import { useTranslations } from "next-intl";

export default function LocationsHeader() {
  const t = useTranslations("locations");

  return (
    <section className="px-6 pt-32 pb-8 lg:px-14 lg:pt-40">
      <div className="mx-auto flex max-w-[1400px] items-end justify-between">
        <div>
          <div className="mb-3.5 flex items-center gap-3">
            <span className="block h-px w-7 bg-golden" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
              {t("sectionLabel")}
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(48px,9vw,80px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
          >
            {t("title")} <span className="font-editorial text-cinnamon">{t("titleAccent")}</span>
          </h1>
        </div>
        <div className="hidden text-right md:block">
          <div className="font-display text-[48px] leading-none text-espresso">
            10°45<span className="font-editorial">′</span>N
          </div>
          <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-caramel">
            {t("coordsCity")}
          </div>
        </div>
      </div>
    </section>
  );
}
