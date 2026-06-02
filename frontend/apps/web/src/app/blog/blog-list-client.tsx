"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/data/posts";

const TABS = ["All", "Craft", "Recipes", "Saigon", "People", "Notes", "Behind the Scenes", "Ingredients", "News", "Sustainability"];

interface BlogListClientProps {
  posts: BlogPost[];
}

export function BlogListClient({ posts }: BlogListClientProps) {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const observerTarget = useRef<HTMLDivElement>(null);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "All" || p.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [posts, activeTab, searchQuery]);

  const visiblePosts = filteredPosts.slice(0, page * itemsPerPage);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(p => {
            if (p * itemsPerPage < filteredPosts.length) {
              return p + 1;
            }
            return p;
          });
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [filteredPosts.length, itemsPerPage]);
  
  const showFeatured = activeTab === "All" && !searchQuery && visiblePosts.length > 0;
  const featured = showFeatured ? visiblePosts[0] : null;
  const rest = showFeatured ? visiblePosts.slice(1) : visiblePosts;

  return (
    <>
      <section className="px-6 pt-32 pb-2 lg:px-14 lg:pt-40">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between md:flex-row md:items-end">
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
          <div className="mt-8 flex w-full flex-col items-end gap-6 md:mt-0 md:w-auto">
            <input
              type="text"
              placeholder="Search stories..."
              aria-label="Search blog"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full border-b border-crust bg-transparent pb-2 font-display text-2xl text-espresso outline-none placeholder:text-crust/50 focus:border-espresso focus:placeholder:text-transparent md:w-[300px]"
            />
            <div className="flex flex-wrap gap-1.5 md:flex-nowrap">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setActiveTab(t);
                    setPage(1);
                  }}
                  className={`rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[0.1em] transition-colors ${
                    activeTab === t
                      ? "bg-espresso font-bold text-white"
                      : "border border-crust bg-transparent text-cocoa hover:bg-crust/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            {/* Featured */}
            {featured ? (
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
            ) : (
              <div className="hidden lg:block">
                {/* Placeholder or alternative layout when no featured item */}
              </div>
            )}

            {/* Side list / All list */}
            <div className={`flex flex-col gap-4 ${!featured ? "lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : ""}`}>
              {rest.map((p, i) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className={`flex gap-4 py-3.5 ${featured ? (i < rest.length - 1 ? "border-b border-crust" : "") : "border-b border-crust"}`}
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
              {rest.length === 0 && !featured && (
                <p className="py-8 font-news text-lg text-cocoa">No stories found matching your criteria.</p>
              )}
            </div>
          </div>
          
          <div ref={observerTarget} className="mt-12 h-10 w-full">
            {page * itemsPerPage < filteredPosts.length && (
              <div className="flex justify-center">
                <span className="font-mono text-[11px] uppercase tracking-widest text-cocoa animate-pulse">
                  Loading more...
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
