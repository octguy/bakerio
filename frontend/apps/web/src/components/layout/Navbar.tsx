"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import MobileMenu from "./MobileMenu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-[ease] ${
          scrolled
            ? "bg-cream shadow-[0_2px_10px_rgba(44,24,16,0.08)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className={`font-[family-name:var(--font-script)] text-[2.5rem] leading-none transition-colors duration-300 ease-[ease] ${
              scrolled ? "text-espresso" : "text-white"
            }`}
          >
            Bakerio
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors duration-300 ease-[ease] ${
                  scrolled
                    ? "text-espresso hover:text-golden"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="/menu"
              className="btn-primary hidden md:inline-block rounded-[8px] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            >
              Order
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
