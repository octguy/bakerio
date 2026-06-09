'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useViewportPageSize } from '@/lib/use-viewport-page-size';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  getProductsPage,
  listProductImages,
  type Product,
  type Category,
  type PaginatedResponse,
} from '@repo/api-client';
import { getOrderUrl } from '@/lib/public-config';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80';

// Global image cache
const imgCache = new Map<string, string | null>();
const imgPending = new Set<string>();

function useProductImages(productIds: string[]) {
  const [rev, setRev] = useState(0);
  const idsKey = productIds.join(',');

  useEffect(() => {
    const missing = productIds.filter(
      (id) => !imgCache.has(id) && !imgPending.has(id),
    );
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
  allProducts: Product[];
}

export default function MenuContent({
  initialCategories,
  initialPage,
  pageSize,
  allProducts,
}: MenuContentProps) {
  const t = useTranslations('menu');
  const [productsPage, setProductsPage] = useState(initialPage);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [categoriesList] = useState<Category[]>(initialCategories);
  const [active, setActive] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryCounts = allProducts.reduce<Record<string, number>>((acc, p) => {
    const key = p.category_id;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const orderUrl = getOrderUrl();
  const { page, total_pages: totalPages, total, items: productsList, size } =
    productsPage;
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const productImages = useProductImages(productsList.map((p) => p.id));
  const viewportPageSizeOptions = useMemo(
    () => ({
      reserved: 420,
      rowHeight: 280,
      min: Math.max(8, pageSize),
    }),
    [pageSize],
  );
  const viewportPageSize = useViewportPageSize(viewportPageSizeOptions);
  const allCount = allProducts.length || total;

  const rangeTotal = total || productsList.length;
  const from =
    rangeTotal === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(
    rangeTotal,
    (page - 1) * size + productsList.length,
  );


  const loadPage = useCallback(async (
    nextPage: number,
    categorySlug = active,
    sizeOverride?: number,
  ) => {
    if (nextPage < 1) return;
    if (totalPages > 0 && categorySlug === active && nextPage > totalPages) return;
    if (
      nextPage === page &&
      categorySlug === active &&
      (sizeOverride == null || sizeOverride === size)
    ) {
      return;
    }
    setIsPageLoading(true);
    setPageError(null);
    try {
      const next = await getProductsPage({
        category: categorySlug === 'All' ? undefined : categorySlug,
        page: nextPage,
        size: sizeOverride ?? viewportPageSize,
      });
      setProductsPage(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setPageError(t('loadError'));
    } finally {
      setIsPageLoading(false);
    }
  }, [active, page, totalPages, size, viewportPageSize, t]);

  // Refetch first page when viewport size changes
useEffect(() => {
  if (viewportPageSize === size) return;
  const id = window.setTimeout(() => {
    void loadPage(1, active, viewportPageSize);
  }, 0);
  return () => window.clearTimeout(id);
}, [viewportPageSize, active, size, loadPage]);

  const filtered = productsList.filter((p) => {
    const pCategory = categoriesList.find((c) => c.id === p.category_id);
    const categoryMatch =
      active === 'All' || pCategory?.slug === active;
    const searchMatch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  return (
    <section className="px-6 pb-24 lg:px-14 bg-cream">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-crust pb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-caramel">
          <span>{t('pageOf', { page, total: Math.max(totalPages, 1) })}</span>
          <span>{`${from}-${to} of ${total || productsList.length}`}</span>
        </div>
        <div className="grid grid-cols-1 gap-9 md:grid-cols-[220px_1fr] items-start">
          {/* Sidebar */}
          <aside>
            <div className="mb-8">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                aria-label="Search menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-b border-espresso bg-transparent py-2.5 font-display text-[22px] text-espresso placeholder:text-caramel focus:outline-none focus:border-cinnamon transition-colors"
              />
            </div>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">
              {t('category')}
            </div>
            <button
              onClick={() => {
                setActive('All');
                loadPage(1, 'All');
              }}
              className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                active === 'All'
                  ? 'bg-butter font-semibold text-espresso'
                  : 'text-cocoa hover:bg-vanilla'
              }`}
            >
              <span>{t('all')}</span>
              <span className={`font-mono text-[10.5px] ${
                active === 'All' ? 'text-cinnamon' : 'text-caramel'
              }`}
              >
                {allCount}
              </span>
            </button>
            {categoriesList.map((c) => {
              const isActive = active === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActive(c.slug);
                    loadPage(1, c.slug);
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-butter font-semibold text-espresso'
                      : 'text-cocoa hover:bg-vanilla'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="font-mono text-[10.5px] text-caramel">
                    {categoryCounts[c.id] ?? 0}
                  </span>
                </button>
              );
            })}
            <div className="mt-6 rounded-md border border-crust bg-butter p-4">
              <div className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cinnamon">
                {t('refresh')}
              </div>
              <div className="font-editorial text-[14px] leading-[1.45] text-cocoa">
                {t('seasonalNote')}
              </div>
            </div>
          </aside>
          {/* Product grid */}
          <div className="flex flex-col gap-6 w-full">
            {pageError && (
              <div
                role="alert"
                className="rounded-md border border-sienna/30 bg-sienna/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-sienna"
              >
                {pageError}
              </div>
            )}
            <div
              className={`grid grid-cols-2 gap-3.5 transition-opacity sm:grid-cols-3 lg:grid-cols-4 ${
                isPageLoading ? 'opacity-55' : 'opacity-100'
              }`}
            >
              {filtered.map((p, i) => (
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
                      FIG. {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-1 font-display text-[17px] leading-[1.1] tracking-tight text-espresso">
                      {p.name}
                    </h3>
                    <div className="font-editorial text-[12.5px] text-cinnamon">
                      {categoriesList.find((c) => c.id === p.category_id)?.name ||
                        'Bakes'}
                    </div>
                    <div className="mt-auto flex items-baseline justify-between border-t border-dashed border-crust pt-2.5">
                      <span className="font-display text-[16px] text-espresso">
                        {Number(p.price).toLocaleString('vi-VN')}{' '}
                        <span className="ml-0.5 text-[10px] text-caramel">₫</span>
                      </span>
                      <a
                        href={`${orderUrl}/menu?add-to-cart=${p.slug}`}
                        className="bkr-press rounded-full border border-espresso px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-white"
                      >
                        {t('addToCart')}
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <nav
                aria-label="Menu pagination"
                className="mt-4 flex items-center justify-between gap-3 border-t border-crust pt-5"
              >
                {/* First */}
                <button
                  onClick={() => loadPage(1)}
                  disabled={!hasPreviousPage || isPageLoading}
                  aria-label="First page"
                  className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    hasPreviousPage
                      ? 'border border-espresso text-espresso hover:bg-espresso hover:text-white'
                      : 'pointer-events-none border border-crust text-caramel opacity-45'
                  }`}
                >
                  First
                </button>
                {/* Prev */}
                <button
                  onClick={() => loadPage(page - 1)}
                  disabled={!hasPreviousPage || isPageLoading}
                  aria-label="Previous page"
                  className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    hasPreviousPage
                      ? 'border border-espresso text-espresso hover:bg-espresso hover:text-white'
                      : 'pointer-events-none border border-crust text-caramel opacity-45'
                  }`}
                >
                  {t('prev')}
                </button>
                {/* Page Input */}
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page}
                  disabled={isPageLoading}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    if (!Number.isFinite(p)) return;
                    const clamped = Math.min(Math.max(p, 1), totalPages);
                    loadPage(clamped);
                  }}
                  className="w-12 text-center border rounded-md px-2 py-1 font-mono text-[10px]"
                  aria-label="Page number"
                />
                <span className="font-editorial text-[13px] italic text-caramel">
                  of {totalPages}
                </span>
                {/* Next */}
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={!hasNextPage || isPageLoading}
                  aria-label="Next page"
                  className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    hasNextPage
                      ? 'border border-espresso bg-espresso text-white hover:bg-cinnamon'
                      : 'pointer-events-none border border-crust text-caramel opacity-45'
                  }`}
                >
                  {t('next')}
                </button>
                {/* Last */}
                <button
                  onClick={() => loadPage(totalPages)}
                  disabled={!hasNextPage || isPageLoading}
                  aria-label="Last page"
                  className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    hasNextPage
                      ? 'border border-espresso text-espresso hover:bg-espresso hover:text-white'
                      : 'pointer-events-none border border-crust text-caramel opacity-45'
                  }`}
                >
                  Last
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
