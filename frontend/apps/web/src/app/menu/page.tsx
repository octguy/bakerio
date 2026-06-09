import type { Metadata } from 'next';
import {
  getProducts,
  getProductsPage,
  getCategories,
  type Product,
  type Category,
  type PaginatedResponse,
} from '@repo/api-client';
import MenuContent from './MenuContent';
import MenuHeader from './MenuHeader';

export const metadata: Metadata = {
  title: 'Menu — du jour',
  description:
    'Bánh mì, croissant, sourdough, cake, coffee — the full Bakerio carte, refreshed daily at 06:00.',
};

const MENU_PAGE_SIZE = 12;

export default async function MenuPage() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let total = 0;
  let allProducts: Product[] = [];

  try {
    const [productsPage, categoriesList, allProductsList] = await Promise.all([
      getProductsPage({ size: MENU_PAGE_SIZE }),
      getCategories(),
      getProducts(),
    ]);
    products = productsPage.items;
    categories = categoriesList;
    currentPage = productsPage.page;
    totalPages = productsPage.total_pages;
    total = productsPage.total;
    // full list for category counts
    allProducts = allProductsList;
  } catch {
    // Menu renders empty state if data unavailable.
  }

  return (
    <div className="bg-cream text-espresso">
      <MenuHeader />
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
        allProducts={allProducts}
      />
    </div>
  );
}
