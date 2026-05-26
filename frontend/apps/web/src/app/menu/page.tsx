import type { Metadata } from "next";
import MenuContent from "./MenuContent";

export const metadata: Metadata = {
  title: "Menu — du jour",
  description: "52 items refreshed daily at 06:00. Bánh mì, croissant, sourdough, cake, coffee — the full Bakerio carte.",
};

export default function MenuPage() {
  return (
    <div className="bg-cream text-espresso">
      <section className="px-6 pt-32 pb-8 lg:px-14 lg:pt-40">
        <div className="mx-auto flex max-w-[1400px] items-end justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="block h-px w-7 bg-golden" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                The full carte — refreshed daily 06:00
              </span>
            </div>
            <h1
              className="font-display tracking-tight"
              style={{ fontSize: "clamp(48px,8vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
            >
              Menu <span className="font-editorial text-cinnamon">du jour.</span>
            </h1>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-caramel">
              SHOWING 52 OF 52
            </span>
          </div>
        </div>
      </section>
      <MenuContent />
    </div>
  );
}
