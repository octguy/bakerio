"use client";

import { useState, useEffect, useRef, type MouseEvent } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useSearchParams } from "next/navigation";
import { Croissant, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getProductsPage,
  getProduct,
  listProductImages,
  type Product,
  type Category,
  type PaginatedResponse,
} from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { useCartStore } from "@/store/cart";

import { SortDropdown } from "./sort-dropdown";
import { ProductBanner } from "./product-banner";
import { MenuEmptyState } from "./menu-empty-state";

// Module-level cache: product_id → primary image URL
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

function productMatchesCategory(product: Product, category: Category) {
  const menuProduct = product as MenuProduct;
  const productCategory = menuProduct.category;
  const categoryId = getProductCategoryId(product);
  return (
    categoryId === category.id ||
    categoryId === category.slug ||
    productCategory?.id === category.id ||
    productCategory?.id === category.slug ||
    productCategory?.name === category.name
  );
}

function getProductPrice(product: Product) {
  const menuProduct = product as MenuProduct;
  return menuProduct.price ?? menuProduct.base_price ?? 0;
}

export function MenuGrid({
  products,
  categories,
  initialPage,
  pageSize,
}: {
  products: Product[];
  categories: Category[];
  initialPage: PaginatedResponse<Product>;
  pageSize: number;
}) {
  const [productsPage, setProductsPage] = useState(initialPage);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
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
    loadPage(1, categoryId);

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

    let cancelled = false;
    const addSlugToCart = async () => {
      const product = products.find((p) => p.slug === slug) ?? await getProduct(slug);
      if (cancelled || !product) return;

      const price = getProductPrice(product);

      addItem({
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: "",
          basePrice: price,
          image: imgCache.get(product.id) || "",
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
    };
    addSlugToCart();
    return () => {
      cancelled = true;
    };
  }, [searchParams, products, addItem, router]);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const page = productsPage.page;
  const totalPages = productsPage.total_pages;
  const total = productsPage.total;
  const pageProducts = productsPage.items;
  const productImages = useProductImages(pageProducts.map((p) => p.id));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const normalizedSearch = search.trim().toLowerCase();

  const loadPage = async (nextPage: number, category = activeCategory) => {
    if (nextPage < 1 || nextPage > totalPages || (nextPage === page && category === activeCategory)) return;
    setIsPageLoading(true);
    setPageError(null);
    try {
      const categorySlug = categories.find((cat) => cat.id === category)?.slug ?? category;
      const nextProductsPage = await getProductsPage({
        category: category === "all" ? undefined : categorySlug,
        page: nextPage,
        size: pageSize,
      });
      setProductsPage(nextProductsPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setPageError("Could not load more bakes. Please retry.");
    } finally {
      setIsPageLoading(false);
    }
  };

  const filteredAndSorted = [...pageProducts]
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
      const category = categories.find((cat) => cat.id === activeCategory);
      return category ? productMatchesCategory(product, category) : false;
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

  const searchSlotRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const searchSlot = searchSlotRef.current;
    const placeholder = placeholderRef.current;
    if (!searchSlot || !placeholder) return;

    let wasStuck = false;

    const onScroll = () => {
      // If stuck, read placeholder position. If in-flow, read search slot position.
      const referenceNode = wasStuck ? placeholder : searchSlot;
      const rect = referenceNode.getBoundingClientRect();
      // On mobile, maybe we want it to stick at a slightly different offset? 0.5rem (8px) is fine.
      const isStuck = rect.top <= 8;

      if (isStuck !== wasStuck) {
        // iOS Safari bug: changing position to/from fixed while an element is focused 
        // forces a blur and closes the keyboard. If the user is actively using the search bar,
        // we defer the sticky transition.
        if (searchSlot.contains(document.activeElement)) {
          return;
        }

        wasStuck = isStuck;

        if (isStuck) {
          placeholder.style.display = "block";
          placeholder.style.height = `${searchSlot.offsetHeight}px`;
          
          searchSlot.style.position = "fixed";
          searchSlot.style.top = "0.5rem";
          searchSlot.style.left = "var(--menu-search-left)";
          searchSlot.style.width = "var(--menu-search-w)";
          searchSlot.style.zIndex = "50";
        } else {
          placeholder.style.display = "none";
          
          searchSlot.style.position = "";
          searchSlot.style.top = "";
          searchSlot.style.left = "";
          searchSlot.style.width = "";
          searchSlot.style.zIndex = "";
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Also attach to window resize to re-check in case layout changes
    window.addEventListener("resize", onScroll, { passive: true });
    // Re-evaluate when focus leaves the search bar in case we deferred a transition
    searchSlot.addEventListener("focusout", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      searchSlot.removeEventListener("focusout", onScroll);
    };
  }, []);

  useEffect(() => {
    const leftCol = leftColRef.current;
    if (!leftCol) return;
    const updatePosition = () => {
      const rect = leftCol.getBoundingClientRect();
      document.documentElement.style.setProperty("--menu-search-w", `${rect.width}px`);
      document.documentElement.style.setProperty("--menu-search-left", `${rect.left}px`);
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(leftCol);
    return () => observer.disconnect();
  }, []);

  const searchBar = (
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
  );

  return (
    <>
      {/* Hero + Filter Card */}
      <div className="mb-4 rounded-[1.75rem] border border-espresso/10 bg-cream/75 p-3 shadow-[0_22px_55px_-45px_rgba(44,24,16,0.7)] sm:p-4 md:mb-5 md:rounded-[2.25rem] md:p-5 lg:bg-white/72">
        {/* 2×2 Hero Grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,0.9fr)_1.1fr] lg:gap-5 lg:h-[50vh] lg:min-h-[320px] mb-3 sm:mb-4">
          {/* Carousel — order first on mobile, right column on lg+ */}
          <div className="order-first h-[400px] sm:h-[450px] lg:h-auto lg:order-none lg:col-start-2 lg:row-span-full">
            <ProductBanner />
          </div>

          {/* Left column — heading + search + categories + price */}
          <div ref={leftColRef} className="flex flex-col gap-4 lg:col-start-1 lg:row-span-full">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cinnamon">
              oven ledger
            </div>
            <h2 className="font-display text-[clamp(2rem,9vw,4.4rem)] leading-[0.86] tracking-[-0.055em] text-espresso">
              Order by
              <span className="font-editorial italic text-sienna">
                {" "}
                appetite.
              </span>
            </h2>

            {/* Search bar placeholder — prevents layout jump when sticky */}
            <div ref={placeholderRef} className="mt-auto" style={{ display: "none" }} />
            {/* Search bar slot — styles managed by scroll listener to avoid React latency and preserve focus */}
            <div ref={searchSlotRef} className="mt-auto">
              {searchBar}
            </div>

            {/* Category chips */}
            <div className="group relative mt-2 -mx-1 md:mx-0">
              {showLeftChevron && (
                <>
                  <div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-12 w-16 bg-gradient-to-r from-cream to-transparent opacity-0 transition-opacity duration-300 md:block md:group-hover:opacity-100" />
                  <button
                    type="button"
                    onClick={scrollLeft}
                    className="absolute left-0 top-6 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-honey text-espresso shadow-md transition-all active:scale-90 opacity-0 md:flex md:group-hover:opacity-100"
                    aria-label="Scroll categories left"
                  >
                    <ChevronLeft size={20} className="text-espresso" />
                  </button>
                </>
              )}

              <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="scrollbar-hide flex gap-2 overflow-x-auto px-1"
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
                      className={`flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-bold transition-colors transition-transform active:scale-[0.97] md:min-h-12 ${
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

              {showRightChevron && (
                <>
                  <div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-12 w-16 bg-gradient-to-l from-cream to-transparent opacity-0 transition-opacity duration-300 md:block md:group-hover:opacity-100" />
                  <button
                    type="button"
                    onClick={scrollRight}
                    className="absolute right-0 top-6 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-honey text-espresso shadow-md transition-all active:scale-90 opacity-0 md:flex md:group-hover:opacity-100"
                    aria-label="Scroll categories right"
                  >
                    <ChevronRight size={20} className="text-espresso" />
                  </button>
                </>
              )}
            </div>

            {/* Divider — centered in gap-4 by parent flex */}
            <div className="border-t border-espresso/10" />

            {/* Price filter pills */}
            <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {/* Section title */}
      <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">
            Page {page} of {Math.max(totalPages, 1)} · {total} bakes
          </div>
          <h2 className="font-display text-[26px] leading-none tracking-tight text-espresso md:text-[34px]">
            From the counter
          </h2>
        </div>
        <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
      </div>

      {/* Product grid */}
      {pageError && (
        <div role="alert" className="mb-3 rounded-2xl border border-sienna/30 bg-sienna/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">
          {pageError}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-3 pb-16 transition-opacity min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 ${isPageLoading ? "opacity-55" : "opacity-100"}`}>
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
                image: productImages.get(product.id) || "",
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
                    {productImages.get(product.id) ? (
                      <Image
                        src={productImages.get(product.id)!}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 768px) 25vw, (min-width: 380px) 50vw, 100vw"
                        unoptimized
                      />
                    ) : (
                      <Croissant
                        className="text-golden"
                        size={44}
                        aria-hidden="true"
                      />
                    )}
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

      {totalPages > 1 && (
        <nav
          aria-label="Menu pagination"
          className="mb-16 flex items-center justify-between gap-3 rounded-[1.5rem] border border-crust-deep bg-white px-4 py-3 shadow-[0_16px_36px_-30px_rgba(44,24,16,0.85)]"
        >
          <Link
            href="/menu"
            onClick={(event) => {
              event.preventDefault();
              loadPage(page - 1);
            }}
            aria-disabled={!hasPreviousPage}
            className={`rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
              hasPreviousPage
                ? "border border-espresso text-espresso hover:bg-espresso hover:text-white"
                : "pointer-events-none border border-crust text-caramel opacity-45"
            }`}
          >
            Prev
          </Link>
          <span className="text-center font-editorial text-[13px] italic text-caramel">
            Showing {(page - 1) * pageSize + 1}-{(page - 1) * pageSize + pageProducts.length} of {total}
          </span>
          <Link
            href="/menu"
            onClick={(event) => {
              event.preventDefault();
              loadPage(page + 1);
            }}
            aria-disabled={!hasNextPage}
            className={`rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
              hasNextPage
                ? "border border-espresso bg-espresso text-white hover:bg-cinnamon"
                : "pointer-events-none border border-crust text-caramel opacity-45"
            }`}
          >
            Next
          </Link>
        </nav>
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
