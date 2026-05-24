import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { posts } from "@/data/posts";

export const metadata: Metadata = { title: "Blog", description: "Baking tips, recipes, and stories from the Bakerio kitchen. Stay inspired." };

export default function BlogPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
        <Image src="https://images.unsplash.com/photo-1486427944544-d2c246c4df14?w=1920&q=80" alt="Artisan cupcakes and sweet pastries on display in the Bakerio kitchen" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <div className="relative text-center text-white z-10">
          <p className="font-[family-name:var(--font-script)] text-2xl md:text-3xl mb-2">from our kitchen</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold">Stories & News</h1>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block bg-white rounded-[10px] overflow-hidden border border-crust transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,24,16,0.10)]">
                <div className="relative h-52 overflow-hidden">
                  <Image src={post.image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 50vw" />
                  <span className="absolute top-3 left-3 bg-butter text-cinnamon text-xs font-medium px-2.5 py-1 rounded-full">{post.category}</span>
                </div>
                <div className="p-6">
                  <time className="text-xs text-caramel">{new Date(post.date).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}</time>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-espresso text-lg mt-2 group-hover:text-golden transition-colors">{post.title}</h3>
                  <p className="text-cocoa text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
