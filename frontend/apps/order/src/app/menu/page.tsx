import {
  getProductsPage,
  getCategories,
  type Product,
  type Category,
  type PaginatedResponse,
} from "@repo/api-client";
import { MenuGrid } from "./_components/menu-grid";
import { MenuLayoutClient } from "./_components/menu-layout-client";
import { Link } from "next-view-transitions";
import { cacheLife } from "next/cache";
import { Suspense } from "react";

export const unstable_instant = { prefetch: "static" };

const MENU_PAGE_SIZE = 12;

// Cache the catalog across navigations so the branch -> menu transition lands on
// warm data instead of re-suspending into the loading fallback every time. The
// branch list (app/page.tsx) caches the same way; without this the Suspense
// fallback flashes on each visit.
async function getCachedCatalog(): Promise<{
  products: Product[];
  categories: Category[];
  productsPage: PaginatedResponse<Product>;
}> {
  "use cache";
  cacheLife("hours");
  const [productsPage, categories] = await Promise.all([
    getProductsPage({ size: MENU_PAGE_SIZE }),
    getCategories(),
  ]);
  return {
    products: productsPage.items,
    categories,
    productsPage,
  };
}

async function MenuCatalog() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let productsPage: PaginatedResponse<Product> = {
    items: [],
    total: 0,
    page: 1,
    size: MENU_PAGE_SIZE,
    total_pages: 1,
  };
  let loadError = false;

  try {
    ({ products, categories, productsPage } = await getCachedCatalog());
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
    <MenuGrid
      products={products}
      categories={categories}
      initialPage={productsPage}
      pageSize={MENU_PAGE_SIZE}
    />
  );
}

export default async function MenuPage() {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-vanilla px-4 pt-3 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-16 xl:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_58%,#f4dfbd_100%)]" />

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
