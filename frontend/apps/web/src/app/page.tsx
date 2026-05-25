"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProducts } from "@repo/api-client";
import type { Product } from "@repo/api-client";
import { locations } from "@/data/locations";
import { posts } from "@/data/posts";

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
  const featuredLocations = locations.slice(0, 3);
  const featuredPosts = posts.slice(0, 3);

  return (
    <main className="relative bg-cream text-espresso">
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
                  <div className="font-display text-[34px] leading-none tracking-tight text-espresso">{d.n}</div>
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
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                  § ii — from the counter
                </span>
              </div>
              <h2
                className="font-display tracking-tight text-espresso"
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

          {loading ? (
            <div className="py-24 text-center font-editorial text-[16px] italic text-caramel">
              Opening the larder doors…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
              {/* Hero product */}
              {featuredProducts[0] && (
                <article className="bkr-lift flex flex-col overflow-hidden rounded-sm bg-white shadow-[0_10px_30px_-15px_rgba(44,24,16,0.2)] md:row-span-2">
                  <div className="relative h-[300px] md:h-[460px] w-full">
                    <Image
                      src={featuredProducts[0].images?.[0]?.url || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"}
                      alt={featuredProducts[0].name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                    <span className="absolute left-4 top-4 rounded-full border border-crust bg-cream px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-cinnamon">
                      ★ House signature
                    </span>
                    <span className="absolute right-4 top-4 rounded-sm bg-espresso px-3.5 py-2 font-display text-[20px] text-cream">
                      {formatVND(featuredProducts[0].base_price)}₫
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">FIG. 01</span>
                    <h3 className="mt-1.5 font-display text-[34px] leading-none tracking-tight text-espresso">
                      {featuredProducts[0].name}
                    </h3>
                    <div className="font-editorial text-[16px] text-cinnamon">{featuredProducts[0].category?.name}</div>
                    <p className="mt-4 font-news text-[15.5px] leading-[1.55] text-cocoa">
                      Our signature. A loaf baked five times daily, sliced warm, layered with house pâté and a 7-spice mayonnaise. The crust shatters on cue.
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <Link
                        href="/menu"
                        className="bkr-press rounded-full bg-espresso px-5 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cream"
                      >
                        Add to cart
                      </Link>
                      <span className="font-mono text-[10.5px] tracking-[0.1em] text-caramel">⏱ READY IN 10 MIN</span>
                    </div>
                  </div>
                </article>
              )}

              {/* Side products */}
              {featuredProducts.slice(1).map((p, i) => (
                <article
                  key={p.name}
                  className="bkr-lift flex flex-col overflow-hidden rounded-sm bg-white shadow-[0_6px_18px_-10px_rgba(44,24,16,0.18)]"
                >
                  <div className="relative h-[200px] w-full">
                    <Image
                      src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                    {i === 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-sage px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
                      FIG. {String(i + 2).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 font-display text-[20px] leading-[1.05] tracking-tight text-espresso">
                      {p.name}
                    </h3>
                    <div className="font-editorial text-[13px] text-cinnamon">{p.category?.name}</div>
                    <div className="mt-auto flex items-baseline justify-between border-t border-dashed border-crust pt-3">
                      <span className="font-display text-[18px] text-espresso">
                        {formatVND(p.base_price)}
                        <span className="ml-0.5 text-[10px] text-caramel">₫</span>
                      </span>
                      <button className="bkr-press rounded-full border border-espresso px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-espresso">
                        Add +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

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
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                  § iii — atlas
                </span>
              </div>
              <h2
                className="font-display tracking-tight text-espresso"
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

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {featuredLocations.map((l, i) => {
              const heroes = [
                "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=85&auto=format",
                "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1200&q=85&auto=format",
                "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1200&q=85&auto=format",
              ];
              return (
                <article
                  key={l.name}
                  className="bkr-lift overflow-hidden rounded-sm border border-crust bg-white"
                >
                  <div className="relative h-[200px]">
                    <Image src={heroes[i % heroes.length]} alt={l.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                    <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-md border border-crust bg-cream font-mono text-[11px] font-bold text-espresso">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-[22px] leading-[1.1] tracking-tight text-espresso">{l.name}</h3>
                    <div className="mt-1 font-editorial text-[13px] text-cinnamon">{l.address}</div>
                    <div className="mt-4 flex items-center gap-2.5 font-mono text-[10.5px] tracking-wide text-caramel">
                      <span className="inline-flex items-center gap-1 font-semibold text-sage">
                        <span className="bkr-pulse inline-block h-1.5 w-1.5 rounded-full bg-sage" />
                        Open
                      </span>
                      <span>· {l.hours}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
         5. JOURNAL PREVIEW
         ────────────────────────────────────────────────────── */}
      <section className="bg-vanilla px-6 py-24 lg:px-14 lg:py-32">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-7 bg-golden" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                  The journal · since mmxxiv
                </span>
              </div>
              <h2
                className="font-display tracking-tight text-espresso"
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {featuredPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="bkr-lift group overflow-hidden rounded-sm border border-crust bg-white"
              >
                <div className="relative h-[220px]">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cinnamon">
                      ◆ {post.category}
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-caramel">
                      {post.date}
                    </span>
                  </div>
                  <h3 className="font-display text-[20px] leading-[1.15] tracking-tight text-espresso">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 font-news text-[14px] text-cocoa">{post.excerpt}</p>
                  {i === 0 && (
                    <span className="mt-3 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cinnamon">
                      Read on →
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
