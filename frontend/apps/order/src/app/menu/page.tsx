import { getProducts, getCategories } from "@repo/api-client";
import { MenuGrid } from "./_components/menu-grid";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-bold mb-6">Menu</h1>
      <MenuGrid products={products} categories={categories} />
    </main>
  );
}
