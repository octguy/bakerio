"use client";

import Link from "next/link";
import { Camera, Globe, Video, Send } from "lucide-react";

const quickLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/locations", label: "Locations" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "Our Story" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "#", label: "Privacy Policy" },
];

const socialLinks = [
  { href: "https://instagram.com", icon: Camera, label: "Instagram" },
  { href: "https://facebook.com", icon: Globe, label: "Facebook" },
  { href: "https://youtube.com", icon: Video, label: "Youtube" },
];

export default function Footer() {
  return (
    <footer className="bg-espresso">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="font-[family-name:var(--font-script)] text-3xl text-cream">
              Bakerio
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[var(--vanilla)]/80">
              Artisan bakery crafting fresh bread, pastries &amp; cakes daily with love and tradition.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--vanilla)]">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[var(--vanilla)]/70 hover:text-golden transition-colors duration-300 ease-[ease]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--vanilla)]">
              Company
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    className="text-sm text-[var(--vanilla)]/70 hover:text-golden transition-colors duration-300 ease-[ease]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--vanilla)]">
              Connect
            </h3>
            <div className="flex gap-4 mb-6">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-[var(--vanilla)]/70 hover:text-golden transition-colors duration-300 ease-[ease]"
                >
                  <s.icon size={20} />
                </a>
              ))}
            </div>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 rounded-l-[8px] border border-golden/40 bg-transparent px-3 py-2.5 text-sm text-[var(--vanilla)] placeholder:text-[var(--vanilla)]/40 outline-none focus:border-golden"
              />
              <button
                type="submit"
                className="rounded-r-[8px] bg-golden px-4 text-white hover:bg-cinnamon transition-colors duration-300 ease-[ease]"
                aria-label="Subscribe"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-cocoa/20 pt-6 text-center text-xs text-caramel">
          &copy; {new Date().getFullYear()} Bakerio. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
