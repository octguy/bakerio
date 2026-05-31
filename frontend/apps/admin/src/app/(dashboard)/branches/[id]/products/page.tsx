import { getBranch, getProducts } from "@repo/api-client";
import { BranchProductsPageClient } from "./branch-products-page-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BranchProductsPage({ params }: PageProps) {
  const { id } = await params;
  const [branch, products] = await Promise.all([getBranch(id), getProducts()]);

  return (
    <BranchProductsPageClient
      branchId={id}
      branchName={branch.name}
      products={products}
    />
  );
}
