'use client';

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  getProductsPage,
  listProductImages,
  type Product,
  type Category,
  type PaginatedResponse,
} from "@repo/api-client";
import { getOrderUrl } from "@/lib/public-config";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80";

// Global image cache to avoid refetching
const imgCache = new Map<string, string | null>();
const imgPending = new Set<string>();

function useProductImages(productIds: string[]) {
  const [rev, setRev] = useState(0);
  const idsKey = productIds.join(",");

  useEffect(() => {
    const missing = productIds.filter((id) => !imgCache.has(id) && !imgPending.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => imgPending.add(id));
    Promise.allSettled(
      missing.map(async (id) => {
        try {
          const imgs = await listProductImages(id);
          const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
          imgCache.set(id, primary?.url ?? null);
        } catch {
          imgCache.set(id, null);
        } finally {
          imgPending.delete(id);
        }
      }),
    ).then(() => setRev((n) => n + 1));
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  void rev;
  return imgCache;
}

interface MenuContentProps {
  initialCategories: Category[];
  initialPage: PaginatedResponse<Product>;
  pageSize: number;
}

export default function MenuContent({
  initialCategories,
  initialPage,
  pageSize,
}: MenuContentProps) {
  const t = useTranslations("menu");
  const [productsPage, setProductsPage] = useState(initialPage);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [categoriesList] = useState<Category[]>(initialCategories);
  const [active, setActive] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const orderUrl = getOrderUrl();
  const page = productsPage.page;
  const totalPages = productsPage.total_pages;
  const total = productsPage.total;
  const productsList = productsPage.items;
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const productImages = useProductImages(productsList.map((p) => p.id));

  const loadPage = async (nextPage: number, categorySlug = active) => {
    if (nextPage < 1 || nextPage > totalPages || (nextPage === page && categorySlug === active)) return;
    setIsPageLoading(true);
    setPageError(null);
    try {
      const nextProductsPage = await getProductsPage({
        category: categorySlug === "All" ? undefined : categorySlug,
        page: nextPage,
        size: pageSize,
      });
      setProductsPage(nextProductsPage);
      setVisibleCount(12);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setPageError(t("loadError"));
    } finally {
      setIsPageLoading(false);
    }
  };

  const filtered = productsList.filter((p) => {
    const pCategory = categoriesList.find((c) => c.id === p.category_id);
    const categoryMatch = active === "All" || pCategory?.slug === active;
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filtered.length) {
              return prev + 12;
            }
            return prev;
          });
        }
      },
      { rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [filtered.length]);

  const visibleProducts = filtered.slice(0, visibleCount);

  return (
    <section className="px-6 pb-24 lg:px-14 bg-cream">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-crust pb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-caramel">
          <span>{t("pageOf", { page, total: Math.max(totalPages, 1) })}</span>
          <span>{t("showing", { count: filtered.length, total: total || productsList.length })}</span>
        </div>

        <div className="grid grid-cols-1 gap-9 md:grid-cols-[220px_1fr] items-start">
        {/* Sidebar */}
          <aside>
          <div className="mb-8">
            <input 
              type="text" 
              placeholder={t("searchPlaceholder")} 
              aria-label="Search menu"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(12);
              }}
              className="w-full border-b border-espresso bg-transparent py-2.5 font-display text-[22px] text-espresso placeholder:text-caramel focus:outline-none focus:border-cinnamon transition-colors"
            />
          </div>

          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">{t("category")}</div>
          
          <button
            onClick={() => {
              setActive("All");
              setVisibleCount(12);
              loadPage(1, "All");
            }}
            className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
              active === "All" ? "bg-butter font-semibold text-espresso" : "text-cocoa hover:bg-vanilla"
            }`}
          >
            <span>{t("all")}</span>
            <span className={`font-mono text-[10.5px] ${active === "All" ? "text-cinnamon" : "text-caramel"}`}>
              {total}
            </span>
          </button>

          {categoriesList.map((c) => {
            const isActive = active === c.slug;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActive(c.slug);
                  setVisibleCount(12);
                  loadPage(1, c.slug);
                }}
                className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive ? "bg-butter font-semibold text-espresso" : "text-cocoa hover:bg-vanilla"
                }`}
              >
                <span>{c.name}</span>
              </button>
            );
          })}

          <div className="mt-6 rounded-md border border-crust bg-butter p-4">
            <div className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cinnamon">
              {t("refresh")}
            </div>
            <div className="font-editorial text-[14px] leading-[1.45] text-cocoa">
              {t("seasonalNote")}
            </div>
          </div>

          </aside>

          {/* Product grid */}
          <div className="flex flex-col gap-6 w-full">
            {pageError && (
              <div role="alert" className="rounded-md border border-sienna/30 bg-sienna/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-sienna">
                {pageError}
              </div>
            )}
            <div className={`grid grid-cols-2 gap-3.5 transition-opacity sm:grid-cols-3 lg:grid-cols-4 ${isPageLoading ? "opacity-55" : "opacity-100"}`}>
              {visibleProducts.map((p, i) => (
                <article
                key={p.slug}
                className="bkr-lift flex flex-col overflow-hidden rounded-sm border border-crust bg-white"
              >
                <div className="relative h-[160px] w-full">
                  <Image
                    src={productImages.get(p.id) || FALLBACK_IMAGE}
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
                    {categoriesList.find((c) => c.id === p.category_id)?.name || "Bakes"}
                  </div>
                  <div className="mt-auto flex items-baseline justify-between border-t border-dashed border-crust pt-2.5">
                    <span className="font-display text-[16px] text-espresso">
                      {Number(p.price).toLocaleString("vi-VN")}
                      <span className="ml-0.5 text-[10px] text-caramel">₫</span>
                    </span>
                    <a
                      href={`${orderUrl}/menu?add-to-cart=${p.slug}`}
                      className="bkr-press rounded-full border border-espresso px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-white"
                    >
                      {t("addToCart")}
                    </a>
                  </div>
                </div>
              </article>
            ))}
            </div>
            
            {visibleCount < filtered.length && (
              <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">{t("loadingMore")}</span>
              </div>
            )}

            {totalPages > 1 && (
              <nav aria-label="Menu pagination" className="mt-4 flex items-center justify-between gap-3 border-t border-crust pt-5">
                <a
                  href="/menu"
                  onClick={(event) => {
                    event.preventDefault();
                    loadPage(page - 1);
                  }}
                  aria-disabled={!hasPreviousPage}
                  className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    hasPreviousPage
                      ? "border border-espresso text-espresso hover:bg-espresso hover:text-white"
                      : "pointer-events-none border border-crust text-caramel opacity-45"
                  }`}
                >
                  {t("prev")}
                </a>
                <span className="font-editorial text-[13px] italic text-caramel">
                  {(page - 1) * pageSize + 1}-{(page - 1) * pageSize + productsList.length} of {total}
                </span>
                <a
                  href="/menu"
                  onClick={(event) => {
                    event.preventDefault();
                    loadPage(page + 1);
                  }}
                  aria-disabled={!hasNextPage}
                  className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    hasNextPage
                      ? "border border-espresso bg-espresso text-white hover:bg-cinnamon"
                      : "pointer-events-none border border-crust text-caramel opacity-45"
                  }`}
                >
                  {t("next")}
                </a>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
