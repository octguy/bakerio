"use client";

import { useTranslations } from "next-intl";

export default function MenuHeader() {
  const t = useTranslations("menu");

  return (
    <section className="px-6 pt-24 pb-8 lg:px-14 lg:pt-28">
      <div className="mx-auto flex max-w-[1400px] items-end justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="block h-px w-7 bg-golden" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
              {t("sectionLabel")}
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(48px,8vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
          >
            {t("title")} <span className="font-editorial text-cinnamon">{t("titleAccent")}</span>
          </h1>
        </div>
      </div>
    </section>
  );
}
