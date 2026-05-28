import { Suspense } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import OrdersLoading from "../loading";
import { OrderTrackingPageClient } from "./order-tracking-page-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const unstable_instant = false;

export default function OrderTrackingPage({ params }: PageProps) {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrderTrackingPageContent params={params} />
    </Suspense>
  );
}

async function OrderTrackingPageContent({ params }: PageProps) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <OrderTrackingPageClient id={id} />
    </ProtectedRoute>
  );
}
