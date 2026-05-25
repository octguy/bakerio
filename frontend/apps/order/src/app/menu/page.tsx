import { getProducts, getCategories, type Product, type Category } from "@repo/api-client";
import { MenuGrid } from "./_components/menu-grid";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    [products, categories] = await Promise.all([getProducts(), getCategories()]);
  } catch {
    // Backend may not have products endpoint yet
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-28">
      {/* Top bar */}
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-espresso">
          <span className="text-[18px]">‹</span>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">pickup at</div>
            <div className="font-display text-[16px] leading-none text-espresso">Lê Lợi · 0.8km</div>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-3 flex items-center gap-2.5 rounded-full border border-crust bg-white px-4 py-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--caramel)" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span className="flex-1 font-editorial text-[14px] italic text-caramel">
          Search bread, pastry, coffee…
        </span>
        <span className="font-mono text-[10px] tracking-[0.1em] text-caramel">⌘K</span>
      </div>

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

      <MenuGrid products={products} categories={categories} />
    </main>
  );
}
