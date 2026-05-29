import Image from "next/image";
import { Croissant } from "lucide-react";
import { Suspense } from "react";
import { getProduct } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { AddToCartSection } from "../_components/add-to-cart";
import Loading from "./loading";

export const unstable_instant = false;

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

async function ProductDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product;

  try {
    product = await getProduct(slug);
  } catch {
    return <p className="p-8 text-center">Product not found</p>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
       <div className="bg-latte rounded-[10px] aspect-video relative mb-6 overflow-hidden">
         <div className="w-full h-full flex items-center justify-center"><Croissant className="text-golden" size={48} aria-hidden="true" /></div>
       </div>

       <h1 className="font-heading text-2xl font-bold mb-1">{product.name}</h1>
       <p className="text-golden font-semibold text-lg mb-6">{formatVND(product.price)}</p>

      <AddToCartSection product={product} />
    </main>
  );
}
