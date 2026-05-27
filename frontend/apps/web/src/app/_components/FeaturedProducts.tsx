import Image from "next/image";
import Link from "next/link";
import type { Product } from "@repo/api-client";
import { getOrderUrl } from "@/lib/public-config";

interface FeaturedProductsProps {
  featuredProducts: Product[];
  loading: boolean;
  formatVND: (n: number) => string;
}

export function FeaturedProducts({ featuredProducts, loading, formatVND }: FeaturedProductsProps) {
  if (loading) {
    return (
      <div className="py-24 text-center font-editorial text-[16px] italic text-caramel">
        Opening the larder doors…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
      {/* Hero product */}
      {featuredProducts[0] && (
        <article className="bkr-lift flex flex-col overflow-hidden rounded-sm bg-white shadow-[0_10px_30px_-15px_rgba(44,24,16,0.2)] md:row-span-2" aria-label={featuredProducts[0].name}>
          <div className="relative h-[300px] md:h-[460px] w-full">
            <Image
              src={featuredProducts[0].images?.[0]?.url || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"}
              alt={featuredProducts[0].name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            <span className="absolute left-4 top-4 rounded-full border border-crust bg-cream px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-cinnamon">
              ★ House signature
            </span>
            <span className="absolute right-4 top-4 rounded-sm bg-espresso px-3.5 py-2 font-display text-[20px] text-cream">
              {formatVND(featuredProducts[0].base_price)}₫
            </span>
          </div>
          <div className="flex flex-1 flex-col p-7">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">FIG. 01</span>
            <h3 className="mt-1.5 font-display text-[34px] leading-none tracking-tight text-espresso">
              {featuredProducts[0].name}
            </h3>
            <div className="font-editorial text-[16px] text-cinnamon">{featuredProducts[0].category?.name}</div>
            <p className="mt-4 font-news text-[15.5px] leading-[1.55] text-cocoa">
              Our signature. A loaf baked five times daily, sliced warm, layered with house pâté and a 7-spice mayonnaise. The crust shatters on cue.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={`${getOrderUrl()}/menu?add-to-cart=${featuredProducts[0].slug}`}
                className="bkr-press rounded-full bg-espresso px-5 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cream"
              >
                Add to cart
              </a>
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-caramel">⏱ READY IN 10 MIN</span>
            </div>
          </div>
        </article>
      )}

      {/* Side products */}
      {featuredProducts.slice(1).map((p, i) => (
        <article
          key={p.name}
          className="bkr-lift flex flex-col overflow-hidden rounded-sm bg-white shadow-[0_6px_18px_-10px_rgba(44,24,16,0.18)]"
          aria-label={p.name}
        >
          <div className="relative h-[200px] w-full">
            <Image
              src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"}
              alt={p.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 25vw"
            />
            {i === 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-sage px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">
                New
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
              FIG. {String(i + 2).padStart(2, "0")}
            </span>
            <h3 className="mt-1 font-display text-[20px] leading-[1.05] tracking-tight text-espresso">
              {p.name}
            </h3>
            <div className="font-editorial text-[13px] text-cinnamon">{p.category?.name}</div>
            <div className="mt-auto flex items-baseline justify-between border-t border-dashed border-crust pt-3">
              <span className="font-display text-[18px] text-espresso">
                {formatVND(p.base_price)}
                <span className="ml-0.5 text-[10px] text-caramel">₫</span>
              </span>
              <a
                href={`${getOrderUrl()}/menu?add-to-cart=${p.slug}`}
                className="bkr-press rounded-full border border-espresso px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-white"
              >
                Add +
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
