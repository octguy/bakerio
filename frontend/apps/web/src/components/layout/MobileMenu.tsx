"use client";

import { X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-[ease] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-cream flex flex-col shadow-2xl transition-transform duration-300 ease-[ease] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-6">
          <button
            onClick={onClose}
            className="text-espresso hover:text-golden"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-2 px-8 flex-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="group relative text-xl font-medium text-espresso py-2 hover:text-golden transition-colors duration-300 ease-[ease]"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-golden transition-all duration-200 ease-[ease] group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="p-8">
          <a
            href="/menu"
            className="block w-full rounded-[8px] bg-golden py-3.5 text-center text-sm font-semibold uppercase tracking-widest text-white hover:bg-cinnamon transition-colors duration-300 ease-[ease]"
          >
            Order Now
          </a>
        </div>
      </div>
    </>
  );
}
