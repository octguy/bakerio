import type { Metadata } from "next";
import {
  getProductsPage,
  getCategories,
  type Product,
  type Category,
  type PaginatedResponse,
} from "@repo/api-client";
import MenuContent from "./MenuContent";

export const metadata: Metadata = {
  title: "Menu — du jour",
  description: "Bánh mì, croissant, sourdough, cake, coffee — the full Bakerio carte, refreshed daily at 06:00.",
};

const MENU_PAGE_SIZE = 12;

export default async function MenuPage() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let total = 0;

  try {
    const [productsPage, categoriesList] = await Promise.all([
      getProductsPage({ size: MENU_PAGE_SIZE }),
      getCategories(),
    ]);
    products = productsPage.items;
    categories = categoriesList;
    currentPage = productsPage.page;
    totalPages = productsPage.total_pages;
    total = productsPage.total;
  } catch {
    // The menu still renders with an empty state if upstream data is unavailable.
  }

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
        </div>
      </section>
      <MenuContent
        initialCategories={categories}
        initialPage={{
          items: products,
          total,
          page: currentPage,
          size: MENU_PAGE_SIZE,
          total_pages: totalPages,
        } satisfies PaginatedResponse<Product>}
        pageSize={MENU_PAGE_SIZE}
      />
    </div>
  );
}
