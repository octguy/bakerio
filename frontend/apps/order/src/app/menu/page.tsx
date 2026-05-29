import { getProducts, getCategories, type Product, type Category } from "@repo/api-client";
import { MenuGrid } from "./_components/menu-grid";
import { MenuLocationHeader } from "./_components/menu-location-header";
import Link from "next/link";
import { Suspense } from "react";

export const unstable_instant = { prefetch: "static" };

async function MenuCatalog() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let loadError = false;

  try {
    [products, categories] = await Promise.all([getProducts(), getCategories()]);
  } catch {
    loadError = true;
  }

  return loadError ? (
    <div role="alert" className="mt-6 rounded-2xl border border-sienna/30 bg-sienna/10 px-4 py-5 text-center">
      <h1 className="font-display text-[24px] leading-none tracking-tight text-espresso">Menu is unavailable.</h1>
      <p className="mx-auto mt-2 max-w-xs font-editorial text-[13px] italic text-sienna">
        We couldn&apos;t load today&apos;s catalog. Please retry in a moment.
      </p>
      <Link
        href="/menu"
        className="mt-4 inline-flex rounded-full bg-espresso px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cream"
      >
        Retry
      </Link>
    </div>
  ) : (
    <MenuGrid products={products} categories={categories} />
  );
}

export default async function MenuPage() {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip px-4 pt-3 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-16 xl:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_12%,rgba(232,169,78,0.28),transparent_24%),radial-gradient(circle_at_92%_0%,rgba(196,91,74,0.18),transparent_26%),linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_46%,#f4dfbd_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18] [background-image:linear-gradient(90deg,rgba(44,24,16,0.09)_1px,transparent_1px),linear-gradient(rgba(44,24,16,0.06)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="mx-auto grid w-full max-w-[1520px] gap-4 lg:items-start min-[1440px]:grid-cols-[minmax(360px,0.76fr)_minmax(0,1fr)] xl:gap-5 2xl:grid-cols-[minmax(420px,0.8fr)_minmax(0,1.2fr)]">
        <section className="bkr-rise min-w-0 min-[1440px]:sticky min-[1440px]:top-8">
          {/* Compact branch card — loading.tsx renders the same element, so the
              morph from the tapped location card lands here seamlessly. */}
          <MenuLocationHeader />

          {/* Featured banner */}
          <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-espresso/10 bg-espresso text-cream shadow-[0_30px_70px_-45px_rgba(44,24,16,0.85)] sm:min-h-[360px] md:min-h-[420px] lg:min-h-[520px] lg:rounded-[2.75rem] min-[1440px]:!min-h-[calc(100vh-12rem)] 2xl:min-h-[560px]">
            <div
              className="absolute inset-0 scale-105"
              style={{
                background:
                  "linear-gradient(180deg, rgba(44,24,16,0.1), rgba(44,24,16,0.88)), url(https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=85&auto=format) center/cover",
              }}
            />
            <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-3 sm:inset-x-7 sm:top-7">
              <div className="rounded-full border border-cream/30 bg-cream/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-espresso shadow-lg">
                ★ today&apos;s batch
              </div>
              <div className="hidden -rotate-6 rounded-full bg-honey px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-espresso shadow-[0_12px_24px_rgba(0,0,0,0.25)] sm:block">
                11 left
              </div>
            </div>
            <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-7 lg:bottom-8">
              <div className="mb-4 h-px w-24 origin-left bg-honey bkr-fill [--fill-scale:1]" />
              <h1 className="max-w-[11ch] font-display text-[clamp(3rem,16vw,6.6rem)] leading-[0.76] tracking-[-0.08em] text-cream drop-shadow-[0_16px_30px_rgba(0,0,0,0.28)] lg:text-[clamp(3.4rem,5.5vw,6.4rem)] min-[1440px]:text-[clamp(3.75rem,4.8vw,5.9rem)] 2xl:text-[clamp(4.25rem,6vw,7.5rem)]">
                48-hour
                <span className="block translate-x-5 font-editorial italic text-honey sm:translate-x-10">sourdough.</span>
              </h1>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <div className="rounded-full bg-cream px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-espresso">
                  110K₫ · crackly at 11:00
                </div>
                <p className="max-w-[16rem] font-editorial text-[14px] italic leading-snug text-cream/82">
                  A counter card for the loaf people ask about before they order coffee.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bkr-rise-1 min-w-0 lg:pt-2">
          <Suspense fallback={<div className="py-12 text-center font-editorial text-[14.5px] italic text-caramel">Opening today&apos;s batch…</div>}>
            <MenuCatalog />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
