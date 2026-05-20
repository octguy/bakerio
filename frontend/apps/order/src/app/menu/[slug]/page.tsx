import Image from "next/image";
import { Croissant } from "lucide-react";
import { getProduct } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { AddToCartSection } from "../_components/add-to-cart";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
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
        {product.images?.[0] ? (
          <Image src={product.images[0].url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Croissant className="text-golden" size={48} aria-hidden="true" /></div>
        )}
      </div>

      <h1 className="font-heading text-2xl font-bold mb-1">{product.name}</h1>
      <p className="text-espresso/60 text-sm mb-2">{product.description}</p>
      <p className="text-golden font-semibold text-lg mb-6">{formatVND(product.base_price)}</p>

      <AddToCartSection product={product} />
    </main>
  );
}
