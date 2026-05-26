"use client";

import Link from "next/link";
import { Camera, Globe, Video } from "lucide-react";
import { locations } from "@/data/locations";
import { getOrderUrl } from "@/lib/public-config";

const navLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/locations", label: "Locations" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const socialLinks = [
  { href: "https://instagram.com", icon: Camera, label: "Instagram" },
  { href: "https://facebook.com", icon: Globe, label: "Facebook" },
  { href: "https://youtube.com", icon: Video, label: "Youtube" },
];

export default function Footer() {
  const orderUrl = getOrderUrl();
  const locationCount = locations.length;

  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-14 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-baseline gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 22V8" stroke="var(--honey)" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z" stroke="var(--honey)" strokeWidth="1.3" />
                <path d="M12 12c-2.5-.5-4.5-1.7-4.5-3.5 0-1 .5-1.7 1.5-2 1.5 1 2.5 2.7 3 5.5z" stroke="var(--honey)" strokeWidth="1.2" />
                <path d="M12 12c2.5-.5 4.5-1.7 4.5-3.5 0-1-.5-1.7-1.5-2-1.5 1-2.5 2.7-3 5.5z" stroke="var(--honey)" strokeWidth="1.2" />
              </svg>
              <span className="font-display text-[24px] tracking-tight">Bakerio</span>
            </Link>
            <p className="mt-5 max-w-[360px] font-news text-[15px] leading-[1.55] text-cream/70">
              A bakery rooted in Saigon. Sourdough fermented 48 hours, butter croissants laminated by hand at
              4&nbsp;a.m., bánh mì on a crust we don&apos;t apologise for.
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition-colors hover:border-honey hover:text-honey"
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-honey/70">Explore</h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[14px] text-cream/80 transition-colors hover:text-honey">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trade */}
          <div>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-honey/70">Trade</h3>
            <ul className="space-y-2.5 text-[14px] text-cream/80">
              <li>Wholesale</li>
              <li>Press</li>
              <li>Recruiting</li>
              <li>Privacy</li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-honey/70">Hours · Saigon</h3>
            <div className="font-display text-[28px] leading-none text-cream">06:00 — 22:00</div>
            <div className="mt-2 font-editorial text-[14px] text-honey">every day, {locationCount} shops</div>
            <a
              href={orderUrl}
              className="bkr-press mt-5 inline-flex items-center gap-2 rounded-full border border-honey px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-honey"
            >
              Order online <span>→</span>
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-cocoa/40 pt-6 font-mono text-[10.5px] uppercase tracking-[0.16em] text-cream/50 sm:flex-row">
          <span>© Bakerio mmxxiv–mmxxvi · {locationCount} shops · Saigon</span>
          <span>10°45′N · 106°40′E</span>
        </div>
      </div>
    </footer>
  );
}
