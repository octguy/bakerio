import Image from "next/image";
import { ChevronDown } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/cards/ProductCard";
import LocationCard from "@/components/cards/LocationCard";
import TestimonialCard from "@/components/cards/TestimonialCard";
import CounterAnimation from "@/components/ui/CounterAnimation";
import HeroAnimation from "@/components/ui/HeroAnimation";
import { products } from "@/data/products";
import { locations } from "@/data/locations";
import { testimonials } from "@/data/testimonials";
import { posts } from "@/data/posts";

export default function Home() {
  const featuredProducts = products.slice(0, 4);
  const featuredLocations = locations.slice(0, 3);
  const featuredPosts = posts.slice(0, 3);

  return (
    <main>
      {/* 1. Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80"
          alt="Freshly baked bread"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <div className="relative z-10 text-center text-white px-4 max-w-3xl">
          <HeroAnimation>
            <p className="font-[family-name:var(--font-script)] text-4xl md:text-5xl mb-4">freshly baked happiness</p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl font-bold mb-6 tracking-wide">Every Bite Tells a Story</h1>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-xl mx-auto">
              Artisan cakes, pastries, and bread crafted with love and the finest ingredients.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="/menu" className="btn-primary px-8 py-3 rounded-[8px] font-medium uppercase tracking-wider text-sm">
                View Menu
              </a>
              <a href="/locations" className="btn-white px-8 py-3 rounded-[8px] font-medium uppercase tracking-wider text-sm">
                Find Locations
              </a>
            </div>
          </HeroAnimation>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white">
          <ChevronDown size={32} />
        </div>
      </section>

      {/* 2. Brand Statement */}
      <ScrollReveal>
        <section className="py-24 md:py-32 px-4 bg-cream">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-[2px] bg-golden mx-auto mb-8" />
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-bold text-espresso leading-tight">
              Baked with Heart, Served with Love
            </h2>
          </div>
        </section>
      </ScrollReveal>

      {/* 3. Featured Products */}
      <ScrollReveal stagger={0.15}>
        <section className="py-24 md:py-32 px-4 max-w-6xl mx-auto">
          <SectionHeader script="our favorites" title="From Our Kitchen" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.name} {...p} />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 4. Story/Video Section */}
      <section className="relative py-32 md:py-40 flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1920&q=80"
          alt="Baker at work"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <ScrollReveal className="relative z-10 text-center text-white px-4 max-w-2xl">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center animate-[pulse-play_2s_ease-in-out_infinite]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
            </div>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-bold mb-8">Every Bite Tells a Story</h2>
          <a href="/about" className="btn-white inline-block px-8 py-3 rounded-[8px] font-medium uppercase tracking-wider text-sm">
            Our Story
          </a>
        </ScrollReveal>
      </section>

      {/* 5. Stats Counter */}
      <section className="py-24 md:py-32 px-4 bg-cream">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-5xl md:text-6xl font-bold text-golden font-[family-name:var(--font-display)]">
              <CounterAnimation target={10} suffix="+" />
            </p>
            <p className="text-cocoa mt-3 text-lg">Branches</p>
          </div>
          <div>
            <p className="text-5xl md:text-6xl font-bold text-golden font-[family-name:var(--font-display)]">
              <CounterAnimation target={50} suffix="+" />
            </p>
            <p className="text-cocoa mt-3 text-lg">Products</p>
          </div>
          <div>
            <p className="text-5xl md:text-6xl font-bold text-golden font-[family-name:var(--font-display)]">
              <CounterAnimation target={10000} suffix="+" />
            </p>
            <p className="text-cocoa mt-3 text-lg">Happy Customers</p>
          </div>
        </div>
      </section>

      {/* 6. Locations Preview */}
      <ScrollReveal stagger={0.15}>
        <section className="py-24 md:py-32 px-4 max-w-6xl mx-auto">
          <SectionHeader script="find us" title="Our Locations" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredLocations.map((l) => (
              <LocationCard key={l.name} {...l} />
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/locations" className="btn-outline px-8 py-3 rounded-[8px] font-medium uppercase tracking-wider text-sm">
              View All Locations
            </a>
          </div>
        </section>
      </ScrollReveal>

      {/* 7. Blog/Library Section */}
      <ScrollReveal stagger={0.15}>
        <section className="py-24 md:py-32 px-4 max-w-6xl mx-auto">
          <SectionHeader script="from our kitchen" title="Stories & News" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredPosts.map((post) => (
              <a key={post.slug} href={`/blog/${post.slug}`} className="group rounded-[10px] overflow-hidden bg-white shadow-[0_4px_16px_rgba(44,24,16,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={post.image} alt={post.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-golden mb-2">{post.category}</p>
                  <h3 className="font-[family-name:var(--font-display)] font-semibold text-espresso leading-snug">{post.title}</h3>
                  <p className="text-sm text-cocoa mt-2 line-clamp-2">{post.excerpt}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/blog" className="btn-outline px-8 py-3 rounded-[8px] font-medium uppercase tracking-wider text-sm">
              View All Stories
            </a>
          </div>
        </section>
      </ScrollReveal>

      {/* 8. Testimonials */}
      <ScrollReveal stagger={0.15}>
        <section className="py-24 md:py-32 px-4 max-w-6xl mx-auto">
          <SectionHeader script="kind words" title="What Our Customers Say" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 9. CTA Section */}
      <section className="relative py-32 md:py-40 flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&q=80"
          alt="Bakery interior"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <ScrollReveal className="relative z-10 text-center text-white px-4 max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-bold mb-4">Visit Us Today</h2>
          <p className="text-white/85 text-lg mb-8">Find your nearest Bakerio and taste the difference.</p>
          <a href="/locations" className="btn-primary inline-block px-8 py-3 rounded-[8px] font-medium uppercase tracking-wider text-sm">
            Find Locations
          </a>
        </ScrollReveal>
      </section>
    </main>
  );
}
