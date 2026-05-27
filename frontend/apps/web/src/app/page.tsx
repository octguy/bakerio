"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProducts } from "@repo/api-client";
import type { Product } from "@repo/api-client";
import { locations } from "@/data/locations";
import { posts } from "@/data/posts";
import { FeaturedProducts } from "./_components/FeaturedProducts";
import { FeaturedLocations } from "./_components/FeaturedLocations";
import { RecentPosts } from "./_components/RecentPosts";

const HERO_IMG = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=2200&q=85&auto=format";
const INSET_IMG = "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=85&auto=format";

const TICKER_ITEMS = [
  "◆ District 1",
  "◆ District 3",
  "◆ District 7",
  "◆ Bình Thạnh",
  "◆ Phú Nhuận",
  "◆ Thảo Điền",
  "◆ Open 06:00 — 22:00",
  "◆ Bánh mì · Croissant · Sourdough · Cà phê",
  "◆ Order before 09:00 for same-day delivery",
];

function formatVND(n: number) {
  return n.toLocaleString("vi-VN");
}

export default function Home() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then((data) => {
      setProductsList(data);
      setLoading(false);
    });
  }, []);

  const featuredProducts = productsList.slice(0, 6);
  const featuredLocations = locations.slice(0, 6);
  const featuredPosts = posts.slice(0, 3);

  return (
    <div className="relative bg-cream text-espresso">
      {/* ──────────────────────────────────────────────────────
         1. EDITORIAL HERO
         ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden pt-24 pb-20">
        {/* Paper-wash backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 10%, rgba(212,148,58,0.07), transparent 50%), radial-gradient(circle at 10% 90%, rgba(107,143,94,0.06), transparent 40%)",
          }}
        />

        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-14">
          {/* Left — editorial copy */}
          <div className="flex flex-col justify-between pt-10 pb-6">
            <div>
              <div className="bkr-rise mb-7 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
                  No. 011 — Mùa Hè 2026
                </span>
              </div>

              <h1
                className="bkr-rise-1 font-display tracking-tight text-espresso"
                style={{ fontSize: "clamp(64px,11vw,148px)", lineHeight: 0.88, letterSpacing: "-0.025em" }}
              >
                Every{" "}
                <br />
                bite tells{" "}
                <br />
                a <span className="font-editorial text-cinnamon">story.</span>
              </h1>

              <p className="bkr-rise-2 mt-8 max-w-[460px] font-news text-[18px] leading-[1.5] text-cocoa">
                A bakery rooted in Saigon. Sourdough fermented 48 hours, butter croissants laminated by
                hand at 4 a.m., bánh mì on a crust we don&apos;t apologise for.
              </p>

              <div className="bkr-rise-3 mt-9 flex flex-wrap gap-3">
                <Link
                  href="/menu"
                  aria-label="View Menu"
                  className="bkr-press inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-cream"
                >
                  The Menu <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/locations"
                  aria-label="Find Locations"
                  className="bkr-press inline-flex items-center gap-2 rounded-full border border-espresso px-6 py-3 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-espresso"
                >
                  Visit a Shop
                </Link>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-crust pt-8">
              {[
                { n: "11", label: "Cửa hàng", sub: "across HCMC" },
                { n: "06:00", label: "Mở cửa", sub: "every morning" },
                { n: "48h", label: "Lên men", sub: "sourdough" },
              ].map((d) => (
                <div key={d.label}>
                  <div className="font-display tabular-nums text-[34px] leading-none tracking-tight text-espresso">{d.n}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cinnamon">
                    {d.label}
                  </div>
                  <div className="mt-1 font-editorial text-[11.5px] text-caramel">{d.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — photographic stack */}
          <div className="relative h-[640px] pt-4">
            {/* Main bread image */}
            <div className="absolute right-0 top-6 h-[540px] w-[94%] overflow-hidden rounded-sm shadow-[0_30px_60px_-20px_rgba(44,24,16,0.35)]">
              <Image src={HERO_IMG} alt="A loaf of pain de campagne, golden crust" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-espresso/50" />
              <div className="absolute bottom-6 left-6 max-w-[280px] text-white">
                <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] opacity-70">
                  FIG. 01 · pain de campagne
                </div>
                <div className="font-editorial text-[18px] leading-tight">
                  A 48-hour ferment, a 12-minute crust.
                </div>
              </div>
            </div>

            {/* Inset card */}
            <div
              className="absolute bottom-6 left-2 hidden h-[280px] w-[220px] overflow-hidden rounded-sm border-[6px] border-white shadow-[0_20px_40px_-10px_rgba(44,24,16,0.4)] md:block"
              style={{ transform: "rotate(-3deg)" }}
            >
              <Image src={INSET_IMG} alt="Patisserie close-up" fill className="object-cover" sizes="220px" />
            </div>

            {/* Floating seal */}
            <div
              className="bkr-float absolute right-[-8px] top-20 hidden h-[110px] w-[110px] flex-col items-center justify-center rounded-full bg-cinnamon text-cream shadow-[0_8px_20px_rgba(44,24,16,0.3)] md:flex"
              style={{ ["--rot" as string]: "8deg", transform: "rotate(8deg)" }}
            >
              <span className="font-script text-[30px] leading-none">fresh</span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em]">every dawn</span>
            </div>

            {/* Price tag */}
            <div
              className="absolute right-6 top-[360px] hidden rounded-sm border border-crust bg-cream px-3.5 py-2.5 font-mono text-[10px] tracking-wide text-cocoa md:block"
              style={{ transform: "rotate(2deg)" }}
            >
              <div className="mb-1 text-[8.5px] text-caramel">EST.</div>
              <div className="font-display text-[18px] leading-none text-espresso">42K₫</div>
            </div>
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="absolute bottom-0 left-0 right-0 flex h-[60px] items-center overflow-hidden border-t border-cocoa/30 bg-espresso text-cream">
          <div className="bkr-marquee items-center gap-10 whitespace-nowrap pl-14 font-mono text-[11px] uppercase tracking-[0.22em]">
            {[0, 1].map((dup) =>
              TICKER_ITEMS.map((s, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="mr-10"
                  style={{ color: i % 3 === 0 ? "var(--honey)" : "var(--cream)", opacity: i % 3 === 0 ? 1 : 0.7 }}
                >
                  {s}
                </span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
         2. PRODUCTS — Editorial spread
         ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 lg:px-14 lg:py-32">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-14 flex items-end justify-between">
            <div>
              <div className="bkr-rise mb-4 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                  § ii — from the counter
                </span>
              </div>
              <h2
                className="bkr-rise-1 font-display tracking-tight text-espresso"
                style={{ fontSize: "clamp(40px,7vw,84px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
              >
                What we baked <span className="font-editorial text-cinnamon">this morning.</span>
              </h2>
            </div>
            <div className="hidden flex-col items-end gap-2 md:flex">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-caramel">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })}
              </span>
              <Link
                href="/menu"
                className="bkr-press inline-flex items-center rounded-full border border-espresso px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-espresso"
              >
                View full menu →
              </Link>
            </div>
          </div>

          <FeaturedProducts featuredProducts={featuredProducts} loading={loading} formatVND={formatVND} />

          <div className="mt-10 flex items-center justify-between border-t border-crust pt-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-caramel">
            <span>↳ {productsList.length} items in season · refreshed daily at 06:00</span>
            <span className="hidden gap-6 md:flex">
              <span>All / Bread / Pastry / Cake / Coffee</span>
              <span className="text-espresso">↗ Filter by allergen</span>
            </span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
         3. STORY / PULLQUOTE
         ────────────────────────────────────────────────────── */}
      <section className="bg-espresso px-6 py-24 text-cream lg:px-14 lg:py-32">
        <div className="mx-auto flex max-w-[880px] items-start gap-9">
          <div className="font-display text-[120px] leading-[0.6] text-honey">“</div>
          <div>
            <p
              className="font-display tracking-tight"
              style={{ fontSize: "clamp(24px,3.6vw,36px)", lineHeight: 1.2, letterSpacing: "-0.01em" }}
            >
              The trick isn&apos;t the crust, or the crumb, or even the butter. It&apos;s{" "}
              <span className="font-editorial text-honey">showing up</span> before everyone else, and
              caring more than the recipe asks you to.
            </p>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cinnamon font-display text-[16px] text-cream">L</div>
                <div>
                  <div className="font-semibold">Linh Phạm</div>
                  <div className="font-editorial text-[13px] text-honey">Founder · Head baker</div>
                </div>
              </div>
              <Link href="/about" className="text-honey hover:underline font-mono text-[12px] uppercase tracking-wider">
                Our Story →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
         4. LOCATIONS PREVIEW
         ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 lg:px-14 lg:py-32">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <div className="bkr-rise mb-4 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                  § iii — atlas
                </span>
              </div>
              <h2
                className="bkr-rise-1 font-display tracking-tight text-espresso"
                style={{ fontSize: "clamp(38px,6vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
              >
                Eleven shops, <span className="font-editorial text-cinnamon">one city.</span>
              </h2>
            </div>
            <Link
              href="/locations"
              aria-label="View All Locations"
              className="bkr-press hidden items-center rounded-full border border-espresso px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-espresso md:inline-flex"
            >
              Browse the atlas →
            </Link>
          </div>

          <FeaturedLocations featuredLocations={featuredLocations} />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
         5. JOURNAL PREVIEW
         ────────────────────────────────────────────────────── */}
      <section className="bg-vanilla px-6 py-24 lg:px-14 lg:py-32">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <div className="bkr-rise mb-4 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                  The journal · since mmxxiv
                </span>
              </div>
              <h2
                className="bkr-rise-1 font-display tracking-tight text-espresso"
                style={{ fontSize: "clamp(38px,6vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
              >
                Stories <span className="font-editorial text-cinnamon">from the oven.</span>
              </h2>
            </div>
            <Link
              href="/blog"
              aria-label="View All Stories"
              className="bkr-press hidden items-center rounded-full border border-espresso px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-espresso md:inline-flex"
            >
              Browse all stories →
            </Link>
          </div>

          <RecentPosts featuredPosts={featuredPosts} />
        </div>
      </section>
    </div>
  );
}
