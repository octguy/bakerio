import { Croissant } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getProduct } from "@repo/api-client";
import type { Product } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { AddToCartSection } from "../_components/add-to-cart";
import Loading from "./loading";

export const unstable_instant = false;

type DetailProduct = Product & {
  price?: number;
  base_price?: number;
  description?: string;
  images?: { url?: string; is_primary?: boolean }[];
};

function getProductPrice(product: Product) {
  const detailProduct = product as DetailProduct;
  return detailProduct.price ?? detailProduct.base_price ?? 0;
}

function getPrimaryImageUrl(product: Product) {
  const detailProduct = product as DetailProduct;
  return (
    detailProduct.images?.find((image) => image.is_primary)?.url ??
    detailProduct.images?.[0]?.url ??
    ""
  );
}

function getProductDescription(product: Product) {
  const detailProduct = product as DetailProduct;
  return (
    detailProduct.description ??
    "Baked this morning and packed for the walk home."
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

async function ProductDetailContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: Product;

  try {
    product = await getProduct(slug);
  } catch {
    return (
      <main className="relative isolate min-h-screen overflow-hidden px-4 pt-4 pb-28 sm:px-6 md:px-8 md:py-10 xl:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(232,169,78,0.24),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(196,91,74,0.16),transparent_24%),linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_56%,#f4dfbd_100%)]" />
        <section
          role="alert"
          aria-live="polite"
          className="mx-auto flex min-h-[62vh] w-full max-w-[760px] flex-col items-center justify-center rounded-[2rem] border border-crust-deep bg-white/86 p-6 text-center shadow-[0_24px_60px_-45px_rgba(44,24,16,0.8)] md:rounded-[2.5rem] md:p-10"
        >
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cinnamon">
            menu miss
          </div>
          <h1 className="font-display text-[clamp(2.6rem,12vw,5rem)] leading-[0.82] tracking-[-0.06em] text-espresso">
            Product not found
          </h1>
          <p className="mt-4 max-w-md font-editorial text-[16px] italic leading-relaxed text-caramel md:text-[18px]">
            That counter card is gone or has moved. Return to the menu to pick
            something warm.
          </p>
          <Link
            href="/menu"
            className="bkr-press mt-6 inline-flex min-h-12 items-center rounded-full bg-espresso px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-cream shadow-[0_16px_30px_-20px_rgba(44,24,16,0.8)]"
          >
            Back to menu
          </Link>
        </section>
      </main>
    );
  }

  const price = getProductPrice(product);
  const imageUrl = getPrimaryImageUrl(product);

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 pt-4 pb-28 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(232,169,78,0.24),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(196,91,74,0.16),transparent_24%),linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_56%,#f4dfbd_100%)]" />
      <div className="mx-auto grid w-full max-w-[1280px] gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:items-start">
        <section className="bkr-rise">
          <Link
            href="/menu"
            className="bkr-press mb-4 inline-flex min-h-11 items-center rounded-full border border-crust-deep bg-white px-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caramel"
          >
            ‹ Back to menu
          </Link>
          <div className="relative aspect-[4/3] min-h-[300px] overflow-hidden rounded-[2rem] border border-espresso/10 bg-[radial-gradient(circle_at_36%_24%,var(--cream),var(--butter)_52%,var(--crust-deep))] shadow-[0_30px_70px_-48px_rgba(44,24,16,0.9)] sm:min-h-[420px] lg:aspect-[5/4] lg:rounded-[2.75rem]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 58vw, 100vw"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Croissant
                  className="text-golden drop-shadow-[0_22px_28px_rgba(180,114,42,0.24)]"
                  size={88}
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="absolute left-5 top-5 rounded-full bg-cream/92 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-espresso shadow-lg">
              fresh counter pick
            </div>
          </div>
        </section>

        <section className="bkr-rise-1 rounded-[2rem] border border-crust-deep bg-white/86 p-5 shadow-[0_24px_60px_-45px_rgba(44,24,16,0.8)] md:p-7 lg:sticky lg:top-10 lg:rounded-[2.5rem]">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cinnamon">
            made for pickup
          </div>
          <h1 className="mt-2 font-display text-[clamp(2.7rem,14vw,5.8rem)] leading-[0.78] tracking-[-0.07em] text-espresso lg:text-[clamp(4rem,6.8vw,6.6rem)]">
            {product.name}
          </h1>
          <p className="mt-5 max-w-xl font-editorial text-[17px] italic leading-relaxed text-caramel md:text-[19px]">
            {getProductDescription(product)}
          </p>
          <div className="my-6 flex items-end justify-between gap-4 border-y border-crust-deep py-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">
              counter price
            </span>
            <span className="font-display text-[34px] leading-none tracking-tight text-espresso">
              {formatVND(price)}
            </span>
          </div>

          <AddToCartSection product={product} />
        </section>
      </div>
    </main>
  );
}
