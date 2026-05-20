"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Tag, MapPin, Users, ShoppingCart, LogOut, Croissant, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/branches", label: "Branches", icon: MapPin },
  { href: "/users", label: "Users", icon: Users },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
];

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Croissant className="h-6 w-6 text-brand-700" aria-hidden="true" />
        <span className="font-bold text-lg text-brand-700">Bakerio</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 px-3 text-xs text-muted-foreground truncate">{user?.email}</div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 rounded-md border border-border bg-white p-2 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-full w-60 flex-col border-r border-border bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 rounded-md p-1 hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
