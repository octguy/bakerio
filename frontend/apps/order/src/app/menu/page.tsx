import { getProducts, getCategories, type Product, type Category } from "@repo/api-client";
import { MenuGrid } from "./_components/menu-grid";
import { MenuLayoutClient } from "./_components/menu-layout-client";
import { Link } from "next-view-transitions";
import { cacheLife } from "next/cache";
import { Suspense } from "react";

export const unstable_instant = { prefetch: "static" };

// Cache the catalog across navigations so the branch -> menu transition lands on
// warm data instead of re-suspending into the loading fallback every time. The
// branch list (app/page.tsx) caches the same way; without this the Suspense
// fallback flashes on each visit.
async function getCachedCatalog(): Promise<{
  products: Product[];
  categories: Category[];
}> {
  "use cache";
  cacheLife("hours");
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  return { products, categories };
}

async function MenuCatalog() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let loadError = false;

  try {
    ({ products, categories } = await getCachedCatalog());
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

      <MenuLayoutClient
        catalogSection={
          <Suspense fallback={<div className="py-12 text-center font-editorial text-[14.5px] italic text-caramel">Opening today&apos;s batch…</div>}>
            <MenuCatalog />
          </Suspense>
        }
      />
    </main>
  );
}
