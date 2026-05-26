"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { getOrderUrl } from "@/lib/public-config";
import MobileMenu from "./MobileMenu";

const navLinks = [
  { href: "/menu", label: "Bánh" },
  { href: "/menu", label: "Pâtisserie" },
  { href: "/menu", label: "Cà phê" },
  { href: "/locations", label: "Locations" },
  { href: "/blog", label: "Journal" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const orderUrl = getOrderUrl();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-[ease] ${
          scrolled
            ? "bg-cream/95 backdrop-blur border-b border-crust shadow-[0_1px_0_rgba(44,24,16,0.04)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className={`flex items-baseline gap-3 transition-colors duration-300 ${
              scrolled ? "text-espresso" : "text-white"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 22V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 12c-2.5-.5-4.5-1.7-4.5-3.5 0-1 .5-1.7 1.5-2 1.5 1 2.5 2.7 3 5.5z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M12 12c2.5-.5 4.5-1.7 4.5-3.5 0-1-.5-1.7-1.5-2-1.5 1-2.5 2.7-3 5.5z" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="font-display text-[1.4rem] leading-none tracking-tight">Bakerio</span>
            <span
              className={`hidden md:inline font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                scrolled ? "text-caramel" : "text-white/70"
              }`}
            >
              est. mmxxiv · saigon
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-9">
            {navLinks.map((link, i) => (
              <Link
                key={`${link.href}-${link.label}-${i}`}
                href={link.href}
                aria-current={isActiveLink(link.href) ? "page" : undefined}
                className={`border-b pb-0.5 text-[13px] font-medium tracking-wide transition-colors duration-300 ${
                  isActiveLink(link.href)
                    ? scrolled
                      ? "border-espresso text-espresso"
                      : "border-white/80 text-white"
                    : scrolled
                      ? "border-transparent text-caramel hover:text-espresso"
                      : "border-transparent text-white/85 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span
              className={`hidden md:inline font-mono text-[10.5px] tracking-[0.12em] transition-colors ${
                scrolled ? "text-caramel" : "text-white/70"
              }`}
            >
              vi · en
            </span>
            <a
              href={orderUrl}
              className={`hidden md:inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors bkr-press ${
                scrolled
                  ? "bg-espresso text-cream hover:bg-cocoa"
                  : "bg-white text-espresso hover:bg-cream"
              }`}
            >
              Order online <span aria-hidden>→</span>
            </a>
            <button
              className={`md:hidden transition-all duration-300 ease-[ease] ${
                scrolled ? "text-espresso" : "text-white"
              } ${menuOpen ? "rotate-180" : "rotate-0"}`}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
