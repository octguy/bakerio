"use client";

import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@repo/api-client";
import { getMockDashboardStats, getMockDailyRevenue, getMockOrdersByStatus, getMockRecentOrders } from "@repo/api-client/mock/analytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Package, DollarSign, ShoppingCart, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#ef4444"];

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "default",
  PREPARING: "secondary",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default function DashboardPage() {
  const stats = getMockDashboardStats();
  const dailyRevenue = getMockDailyRevenue();
  const ordersByStatus = getMockOrdersByStatus();
  const recentOrders = getMockRecentOrders();

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const activeProductCount = products?.filter((p) => p.is_active).length ?? stats.activeProducts;

  const statCards = [
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
    { label: "Revenue", value: formatCurrency(stats.revenue), icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: "Active Products", value: activeProductCount.toString(), icon: Package, color: "text-brand-600 bg-brand-50" },
    { label: "Low Stock", value: stats.lowStockItems.toString(), icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/products">
            <Button size="sm"><Plus className="h-4 w-4" /> Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg p-2.5 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Order ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{o.id}</td>
                    <td className="py-2">{o.customer}</td>
                    <td className="py-2">{formatCurrency(o.total)}</td>
                    <td className="py-2"><Badge variant={statusVariant[o.status] || "secondary"}>{o.status.replace(/_/g, " ")}</Badge></td>
                    <td className="py-2 text-muted-foreground">{new Date(o.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
