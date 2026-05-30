"use client";

import { useState, useEffect, useRef, type MouseEvent } from "react";
import { Link } from "next-view-transitions";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useSearchParams } from "next/navigation";;
import { Croissant, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product, Category } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { useCartStore } from "@/store/cart";

import { SortDropdown } from "./sort-dropdown";
import { MenuEmptyState } from "./menu-empty-state";

type MenuProduct = Product & {
  price?: number;
  base_price?: number;
  category_id?: string;
  category?: { id?: string; name?: string };
  sort_order?: number;
};

const DESKTOP_CART_MEDIA_QUERY = "(min-width: 1024px)";

function getProductCategoryId(product: Product) {
  const menuProduct = product as MenuProduct;
  return menuProduct.category_id ?? menuProduct.category?.id ?? "";
}

function getProductCategoryName(product: Product, categories: Category[]) {
  const categoryId = getProductCategoryId(product);
  const menuProduct = product as MenuProduct;
  return (
    categories.find((category) => category.id === categoryId)?.name ??
    menuProduct.category?.name ??
    ""
  );
}

function getProductPrice(product: Product) {
  const menuProduct = product as MenuProduct;
  return menuProduct.price ?? menuProduct.base_price ?? 0;
}

export function MenuGrid({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "priceLtoH" | "priceHtoL" | "nameAtoZ">("popular");
  const [priceFilter, setPriceFilter] = useState<"all" | "under50k">("all");
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const searchParams = useSearchParams();
  const router = useRouter();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftChevron, setShowLeftChevron] = useState(false);
  const [showRightChevron, setShowRightChevron] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    const isAtStart = el.scrollLeft <= 5;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    setShowLeftChevron(hasOverflow && !isAtStart);
    setShowRightChevron(hasOverflow && !isAtEnd);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [products, categories, search, activeCategory]);

  const scrollLeft = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: -160, behavior: "smooth" });
  };

  const scrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: 160, behavior: "smooth" });
  };

  const handleCategoryClick = (
    e: MouseEvent<HTMLButtonElement>,
    categoryId: string,
  ) => {
    setActiveCategory(categoryId);

    const button = e.currentTarget;
    const container = scrollRef.current;
    if (!container) return;

    const rectButton = button.getBoundingClientRect();
    const rectContainer = container.getBoundingClientRect();

    // The fade overlays are 64px (w-16) wide when active.
    // If left fade is shown, any button with its left edge less than container.left + 64 is covered.
    const leftBoundary = showLeftChevron
      ? rectContainer.left + 64
      : rectContainer.left;

    // If right fade is shown, any button with its right edge greater than container.right - 64 is covered.
    const rightBoundary = showRightChevron
      ? rectContainer.right - 64
      : rectContainer.right;

    const isPartiallyCovered =
      rectButton.left < leftBoundary || rectButton.right > rightBoundary;

    if (isPartiallyCovered) {
      button.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  useEffect(() => {
    const slug = searchParams.get("add-to-cart");
    if (!slug) return;

    const product = products.find((p) => p.slug === slug);
    if (!product) return;

    const price = getProductPrice(product);

    addItem({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: "",
        basePrice: price,
        image: "",
        category: getProductCategoryId(product),
        options: [],
      },
      choices: [],
      quantity: 1,
      unitPrice: price,
    });

    // Clean query param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("add-to-cart");
    const queryStr = params.toString();
    const cleanPath = queryStr ? `/menu?${queryStr}` : "/menu";
    window.history.replaceState(null, "", cleanPath);

    // Transition user to cart
    if (window.matchMedia(DESKTOP_CART_MEDIA_QUERY).matches) {
      const cartState = useCartStore.getState?.();
      if (cartState?.setCartOpen) {
        cartState.setCartOpen(true);
      } else {
        router.push("/cart");
      }
    } else {
      router.push("/cart");
    }
  }, [searchParams, products, addItem, router]);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const normalizedSearch = search.trim().toLowerCase();
  
  const filteredAndSorted = [...products]
    .filter((product) => {
      if (!normalizedSearch) return true;
      return [
        product.name,
        product.slug,
        getProductCategoryName(product, categories),
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    })
    .filter((product) => {
      if (activeCategory === "all") return true;
      return getProductCategoryId(product) === activeCategory;
    })
    .filter((product) => {
      if (priceFilter === "all") return true;
      if (priceFilter === "under50k") return getProductPrice(product) < 50000;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return ((a as MenuProduct).sort_order || 0) - ((b as MenuProduct).sort_order || 0);
      }
      if (sortBy === "priceLtoH") {
        return getProductPrice(a) - getProductPrice(b);
      }
      if (sortBy === "priceHtoL") {
        return getProductPrice(b) - getProductPrice(a);
      }
      if (sortBy === "nameAtoZ") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  return (
    <>
      {/* Sticky Search Bar */}
      <div className="sticky top-2 z-40 mb-4 transition-all md:top-4">
        <div className="flex min-h-12 items-center gap-2.5 rounded-full border-2 border-espresso bg-white px-4 py-3 shadow-[6px_6px_0_var(--espresso)] transition-transform focus-within:-translate-y-0.5 sm:px-5">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--caramel)"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <label htmlFor="menu-search" className="sr-only">
            Search menu
          </label>
          <input
            id="menu-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bread, pastry, coffee…"
            className="min-w-0 flex-1 bg-transparent font-editorial text-[15px] italic text-espresso placeholder:text-caramel focus:outline-none md:text-[16px]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-butter font-mono text-[16px] text-caramel transition-transform active:scale-90"
            >
              ×
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="font-mono text-[10px] tracking-[0.1em] text-caramel"
            >
              ⌘K
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-[1.75rem] border border-espresso/10 bg-cream/75 p-3 shadow-[0_22px_55px_-45px_rgba(44,24,16,0.7)] sm:p-4 md:mb-5 md:rounded-[2.25rem] md:p-5 lg:bg-white/72">
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cinnamon">
              oven ledger
            </div>
            <h2 className="mt-1 font-display text-[clamp(2rem,9vw,4.4rem)] leading-[0.86] tracking-[-0.055em] text-espresso">
              Order by
              <span className="font-editorial italic text-sienna">
                {" "}
                appetite.
              </span>
            </h2>
          </div>
          <div className="max-w-[18rem] rounded-2xl border border-crust-deep bg-butter/60 px-3 py-2 font-editorial text-[13px] italic leading-snug text-caramel sm:text-right md:text-[14px]">
            {products.length} warm choices crossing bread, pastry, coffee and
            pantry shelves.
          </div>
        </div>

        {/* Category chips */}
        <div className="relative -mx-1 md:mx-0">
          {/* Left fade out overlay and interactive chevron */}
          {showLeftChevron && (
            <>
              <div className="pointer-events-none absolute left-0 top-0 z-10 h-12 w-16 bg-gradient-to-r from-cream to-transparent" />
              <button
                type="button"
                onClick={scrollLeft}
                className="absolute left-0 top-6 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-honey text-espresso shadow-md transition-transform active:scale-90"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={20} className="text-espresso" />
              </button>
            </>
          )}

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="scrollbar-hide mb-4 flex gap-2 overflow-x-auto px-1 pb-3 md:mb-5 md:flex-wrap md:overflow-visible md:pb-0"
          >
            <button
              type="button"
              aria-pressed={activeCategory === "all"}
              onClick={(e) => handleCategoryClick(e, "all")}
              className={`flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors transition-transform active:scale-[0.97] md:min-h-12 ${
                activeCategory === "all"
                  ? "bg-espresso text-white shadow-[0_10px_22px_-14px_rgba(44,24,16,0.8)]"
                  : "border border-crust-deep bg-white text-espresso hover:border-cinnamon"
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={(e) => handleCategoryClick(e, cat.id)}
                  className={`flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors transition-transform active:scale-[0.97] md:min-h-12 ${
                    isActive
                      ? "bg-espresso text-white shadow-[0_10px_22px_-14px_rgba(44,24,16,0.8)]"
                      : "border border-crust-deep bg-white text-espresso hover:border-cinnamon"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Right fade out overlay and interactive chevron */}
          {showRightChevron && (
            <>
              <div className="pointer-events-none absolute right-0 top-0 z-10 h-12 w-16 bg-gradient-to-l from-cream to-transparent md:hidden" />
              <button
                type="button"
                onClick={scrollRight}
                className="absolute right-0 top-6 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-honey text-espresso shadow-md transition-transform active:scale-90 md:hidden"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={20} className="text-espresso" />
              </button>
            </>
          )}
        </div>

        {/* Advanced Filter Pills */}
        <div className="mt-1 flex flex-wrap gap-2 border-t border-espresso/10 pt-3 md:mt-2 md:pt-4">
          <span className="flex items-center font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">Price:</span>
          <button
            type="button"
            onClick={() => setPriceFilter("all")}
            className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
              priceFilter === "all"
                ? "bg-espresso text-white"
                : "border border-crust-deep bg-white text-espresso hover:border-cinnamon"
            }`}
          >
            All Prices
          </button>
          <button
            type="button"
            onClick={() => setPriceFilter("under50k")}
            className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
              priceFilter === "under50k"
                ? "bg-espresso text-white"
                : "border border-crust-deep bg-white text-espresso hover:border-cinnamon"
            }`}
          >
            Under 50k
          </button>
        </div>
      </div>

      {/* Section title */}
      <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">
            counter map
          </div>
          <h2 className="font-display text-[26px] leading-none tracking-tight text-espresso md:text-[34px]">
            From the counter
          </h2>
        </div>
        <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-3 pb-16 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] 2xl:grid-cols-[repeat(auto-fit,minmax(min(100%,14.5rem),1fr))]">
        {filteredAndSorted.map((product) => {
          const price = getProductPrice(product);
          const handleAdd = () => {
            addItem({
              product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: "",
                basePrice: price,
                image: "",
                category: getProductCategoryId(product),
                options: [],
              },
              choices: [],
              quantity: 1,
              unitPrice: price,
            });
          };

          return (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[1.65rem] border border-crust-deep bg-white shadow-[0_18px_40px_-34px_rgba(44,24,16,0.85)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_-34px_rgba(44,24,16,0.9)] md:rounded-[2rem]"
            >
              <div className="relative h-[154px] bg-[radial-gradient(circle_at_30%_20%,var(--cream),var(--butter)_58%,var(--crust-deep))] min-[380px]:h-[122px] sm:h-[146px] md:h-[164px]">
                <Link
                  href={`/menu/${product.slug}`}
                  aria-label={`View ${product.name}`}
                >
                  <div className="flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-110">
                    <Croissant
                      className="text-golden drop-shadow-[0_18px_24px_rgba(180,114,42,0.25)]"
                      size={44}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
                <div className="absolute left-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-caramel">
                  {getProductCategoryName(product, categories) || "Bakerio"}
                </div>
                <button
                  type="button"
                  aria-label={`Add ${product.name}`}
                  onClick={handleAdd}
                  className="absolute -bottom-5 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-espresso text-[22px] text-white shadow-[0_10px_22px_rgba(44,24,16,0.34)] transition-transform active:scale-90 md:h-12 md:w-12"
                >
                  +
                </button>
              </div>
              <Link
                href={`/menu/${product.slug}`}
                className="block p-4 pt-6 md:p-5 md:pt-7"
              >
                <h3 className="line-clamp-2 font-display text-[18px] leading-[0.98] tracking-tight text-espresso min-[380px]:text-[15px] sm:text-[17px] md:text-[19px]">
                  {product.name}
                </h3>
                <div className="mt-1.5 line-clamp-1 font-editorial text-[12px] text-cinnamon md:text-[13px]">
                  {getProductCategoryName(product, categories) || "Bakerio"}
                </div>
                <div className="mt-3 font-display text-[18px] text-espresso md:text-[20px]">
                  {formatVND(price)}
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {filteredAndSorted.length === 0 && (
        <MenuEmptyState
          onReset={() => {
            setSearch("");
            setActiveCategory("all");
            setPriceFilter("all");
          }}
        />
      )}

      {/* Floating cart bar */}
      {totalCount > 0 && (
        <div className="fixed right-4 bottom-20 left-4 z-30 sm:left-auto sm:w-[360px] lg:hidden">
          <Link
            href="/cart"
            className="flex min-h-14 items-center justify-between rounded-full bg-espresso px-5 py-3.5 text-white shadow-[0_12px_30px_rgba(44,24,16,0.35)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-honey font-mono text-[12px] font-bold text-espresso">
                {totalCount}
              </div>
              <div>
                <div className="text-[12.5px] font-semibold">View cart</div>
                <div className="font-mono text-[10px] tracking-[0.08em] opacity-70">
                  15–25 min · ready
                </div>
              </div>
            </div>
            <div className="font-display text-[18px]">
              {formatVND(totalAmount)}
            </div>
          </Link>
        </div>
      )}
    </>
  );
}
