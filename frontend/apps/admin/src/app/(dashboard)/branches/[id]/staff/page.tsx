import { BranchStaffPageClient } from "./branch-staff-page-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BranchStaffPage({ params }: PageProps) {
  const { id } = await params;
  return <BranchStaffPageClient branchId={id} />;
}
