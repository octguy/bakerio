import { ProductDetailsPageClient } from "./product-details-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProductDetailsPageClient productSlug={slug} />;
}
