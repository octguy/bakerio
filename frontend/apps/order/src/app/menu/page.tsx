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
    <main className="mx-auto max-w-md px-6 pt-4 pb-28">
      {/* Compact branch card — loading.tsx renders the same element, so the
          morph from the tapped location card lands here seamlessly. */}
      <MenuLocationHeader />

      {/* Featured banner */}
      <div className="relative mb-4 h-[130px] overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(44,24,16,0.65) 30%, rgba(44,24,16,0.1)), url(https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=85&auto=format) center/cover",
          }}
        />
        <div className="absolute inset-0 p-4 text-white">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] opacity-85">★ today&apos;s batch</div>
          <div className="mt-1 font-display text-[24px] leading-none tracking-tight">
            48-hour
            <br />
            <span className="font-editorial italic">sourdough.</span>
          </div>
          <div className="mt-3 inline-block rounded-full bg-honey px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-espresso">
            110K₫ · 11 left
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="font-editorial text-[14.5px] italic text-caramel text-center py-12">Opening today&apos;s batch…</div>}>
        <MenuCatalog />
      </Suspense>
    </main>
  );
}
