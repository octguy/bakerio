"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsersPage, type User } from "@repo/api-client";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { useViewportPageSize } from "@/lib/use-viewport-page-size";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "branch_staff", label: "Branch Staff" },
  { value: "product_manager", label: "Product Manager" },
  { value: "customer", label: "Customer" },
];

export default function AllUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useViewportPageSize();
  const trimmedSearch = debouncedSearch.trim();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeout);
  }, [pageSize]);

  const { data: usersPage, isLoading, error } = useQuery({
    queryKey: ["all-users", { search: trimmedSearch, role, page, size: pageSize }],
    queryFn: () => getUsersPage({ q: trimmedSearch || undefined, role: role || undefined, page, size: pageSize }),
  });

  const users = usersPage?.items ?? [];
  const totalPages = Math.max(1, usersPage?.total_pages ?? 1);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const columns: ColumnDef<User, unknown>[] = [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-espresso">{row.original.full_name}</span>
          <span className="font-mono text-xs text-[var(--admin-muted)]">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => row.original.roles.join(", "),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              System Wide User List
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{
              fontSize: "clamp(26px,3.6vw,32px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            All Users <span className="font-editorial text-cinnamon">· Database</span>
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-admin-line bg-white/70 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full gap-3 sm:max-w-2xl sm:grid-cols-2">
          <div>
            <Label htmlFor="user-search">Search</Label>
            <Input
              id="user-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search all users..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="role-filter">Role</Label>
            <Select
              id="role-filter"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              className="mt-1"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-end">
          <Button type="button" variant="outline" size="sm" aria-label="First page" onClick={() => setPage(1)} disabled={!canGoPrev || isLoading}>
            <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev || isLoading}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-admin-muted">
            <span>Page</span>
            <Input
              aria-label="Jump to users page"
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setPage(Math.min(totalPages, Math.max(1, next)));
              }}
              className="h-8 w-16 appearance-none text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>of {totalPages}</span>
          </div>
          <Button type="button" variant="outline" size="sm" aria-label="Next page" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext || isLoading}>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Last page" onClick={() => setPage(totalPages)} disabled={!canGoNext || isLoading}>
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-destructive">Failed to load users.</p>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          showFooter={false}
        />
      )}
    </div>
  );
}