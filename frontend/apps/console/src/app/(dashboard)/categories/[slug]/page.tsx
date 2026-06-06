import { CategoryDetailsPageClient } from "./category-details-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  return <CategoryDetailsPageClient categorySlug={slug} />;
}
