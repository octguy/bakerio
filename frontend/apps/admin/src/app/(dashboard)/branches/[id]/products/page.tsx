import { getBranch } from "@repo/api-client";
import { BranchProductsPageClient } from "@/components/branch-products-page-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BranchProductsPage({ params }: PageProps) {
  const { id } = await params;
  const branch = await getBranch(id);

  return (
    <BranchProductsPageClient
      branchId={id}
      branchName={branch.name}
    />
  );
}
