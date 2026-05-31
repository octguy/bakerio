import { ProductImagesPageClient } from "./product-images-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductImagesPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductImagesPageClient productId={id} />;
}
