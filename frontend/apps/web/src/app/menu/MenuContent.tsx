'use client';

import { useState } from "react";
import Image from "next/image";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { products, categories } from "@/data/products";

export default function MenuContent() {
  const [active, setActive] = useState<string>("All");
  const filtered = active === "All" ? products : products.filter((p) => p.category === active);

  return (
    <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto">
      <div className="flex gap-2 justify-center flex-wrap mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-6 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all ${
              active === cat
                ? "bg-golden text-white shadow-md"
                : "bg-white text-cocoa border border-crust hover:border-golden hover:text-golden"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <div key={p.slug} className="rounded-[10px] overflow-hidden bg-white border border-crust transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,24,16,0.10)]">
              <div className="relative aspect-[4/3] w-full">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                <span className="absolute top-3 left-3 bg-butter text-cinnamon text-xs font-medium px-2.5 py-1 rounded-full">{p.category}</span>
              </div>
              <div className="p-5">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-espresso">{p.name}</h3>
                <p className="text-golden font-bold mt-1">{p.price.toLocaleString("vi-VN")}₫</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
