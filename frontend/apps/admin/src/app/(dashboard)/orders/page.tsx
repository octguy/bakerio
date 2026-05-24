"use client";

import { useState } from "react";
import { getMockRecentOrders } from "@repo/api-client/mock/analytics";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type OrderRow = { id: string; customer: string; total: number; status: string; date: string };

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "default",
  PREPARING: "secondary",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

// Extended mock data for orders list
const allOrders: OrderRow[] = [
  ...getMockRecentOrders(),
  { id: "ORD-1006", customer: "Võ Thị F", total: 320_000, status: "CANCELLED", date: "2026-05-19T18:20:00Z" },
  { id: "ORD-1007", customer: "Đặng Văn G", total: 175_000, status: "PREPARING", date: "2026-05-19T16:00:00Z" },
  { id: "ORD-1008", customer: "Bùi Thị H", total: 450_000, status: "DELIVERED", date: "2026-05-19T14:30:00Z" },
  { id: "ORD-1009", customer: "Ngô Văn I", total: 92_000, status: "COMPLETED", date: "2026-05-18T20:15:00Z" },
  { id: "ORD-1010", customer: "Dương Thị K", total: 680_000, status: "CONFIRMED", date: "2026-05-18T11:45:00Z" },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = statusFilter === "ALL" ? allOrders : allOrders.filter((o) => o.status === statusFilter);

  const columns: ColumnDef<OrderRow, unknown>[] = [
    { accessorKey: "id", header: "Order ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrency(row.original.total) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={statusVariant[row.original.status] || "secondary"}>{row.original.status.replace(/_/g, " ")}</Badge> },
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleString() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
          <option value="ALL">All Statuses</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <DataTable columns={columns} data={filtered} searchKey="customer" searchPlaceholder="Search by customer..." />
    </div>
  );
}
