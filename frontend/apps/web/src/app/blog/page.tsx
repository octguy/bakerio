import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { posts } from "@/data/posts";

export const metadata: Metadata = {
  title: "Journal — Stories from the oven",
  description: "Essays on craft, recipes, and the people behind Bakerio. Published since mmxxiv.",
};

const TABS = ["All", "Craft", "Recipes", "Saigon", "People", "Notes"];

export default function BlogPage() {
  const [featured, ...rest] = posts;

  return (
    <div className="bg-cream text-espresso">
      <section className="px-6 pt-32 pb-2 lg:px-14 lg:pt-40">
        <div className="mx-auto flex max-w-[1400px] items-end justify-between">
          <div>
            <div className="mb-3.5 flex items-center gap-3">
              <span className="block h-px w-7 bg-golden" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
                The journal · since mmxxiv
              </span>
            </div>
            <h1
              className="font-display tracking-tight"
              style={{ fontSize: "clamp(48px,9vw,80px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
            >
              Stories <span className="font-editorial text-cinnamon">from the oven.</span>
            </h1>
          </div>
          <div className="hidden gap-1.5 md:flex">
            {TABS.map((t, i) => (
              <span
                key={t}
                className={`rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[0.1em] ${
                  i === 0
                    ? "bg-espresso font-bold text-white"
                    : "border border-crust bg-transparent text-cocoa"
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1.4fr_1fr] lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-[1400px] lg:col-span-2">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            {/* Featured */}
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="bkr-lift block overflow-hidden rounded-sm border border-crust bg-white"
              >
                <div className="relative h-[320px]">
                  <Image src={featured.image} alt={featured.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
                </div>
                <div className="p-8">
                  <div className="mb-2.5 flex items-center gap-3">
                    <span className="rounded-full bg-golden px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                      ★ Editor&apos;s pick
                    </span>
                    <span className="font-mono text-[11px] tracking-wider text-caramel">
                      {new Date(featured.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · 11 min read
                    </span>
                  </div>
                  <h2
                    className="font-display tracking-tight"
                    style={{ fontSize: "clamp(28px,3.6vw,42px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
                  >
                    {featured.title.split(" ").slice(0, -2).join(" ")}{" "}
                    <span className="font-editorial text-cinnamon">
                      {featured.title.split(" ").slice(-2).join(" ")}.
                    </span>
                  </h2>
                  <p className="mt-3.5 max-w-[540px] font-news text-[16px] leading-[1.55] text-cocoa">
                    {featured.excerpt}
                  </p>
                  <div className="mt-5 flex items-center gap-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cinnamon font-display text-[14px] text-white">
                      K
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold">Khoa Trần</div>
                      <div className="font-editorial text-[12px] text-cinnamon">co-founder</div>
                    </div>
                    <span className="ml-auto font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">
                      Read on →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Side list */}
            <div className="flex flex-col gap-4">
              {rest.map((p, i) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className={`flex gap-4 py-3.5 ${i < rest.length - 1 ? "border-b border-crust" : ""}`}
                >
                  <div className="relative h-[92px] w-[92px] flex-shrink-0 overflow-hidden rounded-sm">
                    <Image src={p.image} alt={p.title} fill className="object-cover" sizes="92px" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cinnamon">
                        ◆ {p.category}
                      </span>
                      <span className="font-mono text-[10px] tracking-wider text-caramel">
                        {new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <h3 className="font-display text-[19px] leading-[1.15] tracking-tight text-espresso">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
              <a
                href="#"
                className="mt-1.5 self-start font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon"
              >
                Browse all 47 stories →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
