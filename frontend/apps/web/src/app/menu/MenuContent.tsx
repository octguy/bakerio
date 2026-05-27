'use client';

import { useState } from "react";
import Image from "next/image";
import type { Product, Category } from "@repo/api-client";
import { getOrderUrl } from "@/lib/public-config";

const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Nuts", "Vegan-friendly"];

interface MenuContentProps {
  initialProducts: Product[];
  initialCategories: Category[];
}

export default function MenuContent({ initialProducts, initialCategories }: MenuContentProps) {
  const [productsList] = useState<Product[]>(initialProducts);
  const [categoriesList] = useState<Category[]>(initialCategories);
  const [active, setActive] = useState<string>("All");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const orderUrl = getOrderUrl();

  const toggleAllergen = (a: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const filtered = productsList.filter((p) => {
    const pCategory = p.category?.slug ? p.category : categoriesList.find((c) => c.id === (p.category?.id || (p as { category_id?: string }).category_id)) || p.category;
    const categoryMatch = active === "All" || pCategory?.slug === active;
    const allergenMatch =
      selectedAllergens.length === 0 ||
      selectedAllergens.every((a) => p.allergens?.includes(a));
    return categoryMatch && allergenMatch;
  });

  return (
    <section className="px-6 pb-24 lg:px-14 bg-cream">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex items-center justify-end border-b border-crust pb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-caramel">
          Showing {filtered.length} of {productsList.length}
        </div>

        <div className="grid grid-cols-1 gap-9 md:grid-cols-[220px_1fr] items-start">
        {/* Sidebar */}
          <aside>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">Category</div>
          
          <button
            onClick={() => setActive("All")}
            className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
              active === "All" ? "bg-butter font-semibold text-espresso" : "text-cocoa hover:bg-vanilla"
            }`}
          >
            <span>All</span>
            <span className={`font-mono text-[10.5px] ${active === "All" ? "text-cinnamon" : "text-caramel"}`}>
              {productsList.length}
            </span>
          </button>

          {categoriesList.map((c) => {
            const count = productsList.filter((p) => {
              const pCategory = p.category?.slug ? p.category : categoriesList.find((cat) => cat.id === (p.category?.id || (p as { category_id?: string }).category_id)) || p.category;
              return pCategory?.slug === c.slug;
            }).length;
            const isActive = active === c.slug;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c.slug)}
                className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive ? "bg-butter font-semibold text-espresso" : "text-cocoa hover:bg-vanilla"
                }`}
              >
                <span>{c.name}</span>
                <span className={`font-mono text-[10.5px] ${isActive ? "text-cinnamon" : "text-caramel"}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <div className="mt-6 rounded-md border border-crust bg-butter p-4">
            <div className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cinnamon">
              ★ Refresh
            </div>
            <div className="font-editorial text-[14px] leading-[1.45] text-cocoa">
              New seasonal bakes every Monday. Subscribe to our journal for announcements.
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">Allergens</div>
            {ALLERGENS.map((a) => {
              const isChecked = selectedAllergens.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  className="flex items-center gap-2.5 py-1.5 text-[13px] text-cocoa w-full text-left"
                >
                  <span
                    className="block h-3.5 w-3.5 rounded-sm border-[1.5px] border-crust-deep transition-colors"
                    style={{ background: isChecked ? "var(--cinnamon)" : "#fff" }}
                  />
                  <span>{a}</span>
                </button>
              );
            })}
          </div>
          </aside>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <article
                key={p.slug}
                className="bkr-lift flex flex-col overflow-hidden rounded-sm border border-crust bg-white"
              >
                <div className="relative h-[160px] w-full">
                  <Image
                    src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
                    FIG. {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 font-display text-[17px] leading-[1.1] tracking-tight text-espresso">{p.name}</h3>
                  <div className="font-editorial text-[12.5px] text-cinnamon">
                    {(p.category?.name ||
                      categoriesList.find((c) => c.id === (p.category?.id || (p as { category_id?: string }).category_id))?.name) ||
                      "Bakes"}
                  </div>
                  <div className="mt-auto flex items-baseline justify-between border-t border-dashed border-crust pt-2.5">
                    <span className="font-display text-[16px] text-espresso">
                      {p.base_price.toLocaleString("vi-VN")}
                      <span className="ml-0.5 text-[10px] text-caramel">₫</span>
                    </span>
                    <a
                      href={`${orderUrl}/menu?add-to-cart=${p.slug}`}
                      className="bkr-press rounded-full border border-espresso px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-white"
                    >
                      Add +
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
