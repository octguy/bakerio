import { getOrders } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-800",
  READY: "bg-green-100 text-green-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl font-bold mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-espresso/50 mb-2">No orders yet</p>
          <Link href="/menu" className="text-golden font-medium">Start ordering →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-crust rounded-[10px] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-espresso/50">{order.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="space-y-1 mb-2">
                {order.items.map((item) => (
                  <p key={item.id} className="text-sm">{item.product_name} × {item.quantity}</p>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-crust pt-2">
                <span className="text-xs text-espresso/50">{new Date(order.created_at).toLocaleDateString("vi-VN")}</span>
                <span className="font-semibold text-golden">{formatVND(order.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
