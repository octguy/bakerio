import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "@/data/posts";
import BlogPostActions from "./BlogPostActions";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const date = new Date(post.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-cream text-espresso">
      {/* Hero image */}
      <div className="relative h-[360px] pt-20">
        <Image src={post.image} alt={post.title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-espresso/60" />
      </div>

      <div className="relative z-10 mx-auto -mt-40 grid max-w-[1280px] grid-cols-1 gap-12 px-6 pb-24 lg:grid-cols-[180px_minmax(0,1fr)_220px] lg:px-14">
        {/* Left meta */}
        <aside className="hidden pt-52 lg:block">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-cinnamon">
            ◆ {post.category.toUpperCase()} · ESSAY
          </span>
          <div className="mt-5">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-caramel">Published</div>
            <time className="font-display text-[22px] leading-none text-espresso">{date}</time>
          </div>
          <div className="mt-4.5">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-caramel">Time to read</div>
            <div className="font-display text-[22px] leading-none text-espresso">6 minutes</div>
          </div>

          <div className="mt-7 flex flex-col gap-2">
            <Link href="/blog" className="rounded-full border border-crust bg-white px-3 py-1.5 font-mono text-[11px] text-cocoa">
              <span className="mr-2 text-cinnamon">↩</span> Back to journal
            </Link>
            <BlogPostActions slug={post.slug} title={post.title} />
          </div>
        </aside>

        {/* Body */}
        <article className="rounded-md border border-crust bg-white px-8 py-12 lg:px-16 lg:py-14">
          <h1
            className="font-display tracking-tight text-espresso"
            style={{ fontSize: "clamp(36px,5vw,60px)", lineHeight: 0.95, letterSpacing: "-0.025em" }}
          >
            {post.title.split(" ").slice(0, -2).join(" ")}{" "}
            <span className="font-editorial text-cinnamon">{post.title.split(" ").slice(-2).join(" ")}.</span>
          </h1>
          <p className="mt-6 font-editorial text-[22px] leading-[1.4] text-caramel">
            {post.excerpt}
          </p>

          <div className="mt-8 flex items-center gap-3.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-cinnamon font-display text-[15px] text-white">
              L
            </div>
            <div>
              <div className="text-[13.5px] font-semibold">Linh Phạm</div>
              <div className="font-editorial text-[12px] text-caramel">head baker · co-founder</div>
            </div>
          </div>

          <hr className="my-9 border-crust" />

          {/* Drop-cap paragraph */}
          <p className="font-news text-[18px] leading-[1.65] text-cocoa">
            <span className="float-left mr-3 mt-1 font-display text-[78px] leading-[0.85] text-cinnamon">T</span>
            he first time we left the starter for two days, we did so by accident. There was a power cut, a fight
            about a wedding cake, and Khoa had taken the keys home. The dough sat under cloth, fed at midnight,
            fed again at noon. When we came back on Monday we were certain we had wasted three kilograms of good
            flour.
          </p>
          <p className="mt-5 font-news text-[17px] leading-[1.65] text-cocoa">
            What we got instead was the loaf that we now bake every morning at six. A crumb that holds its breath,
            a crust that doesn&apos;t apologise. It taught us the thing nobody tells you in baking school — that
            patience isn&apos;t an ingredient, it&apos;s a kind of <em>permission</em>.
          </p>

          <blockquote
            className="my-8 border-l-[3px] border-golden bg-butter px-7 py-6 font-display tracking-tight text-espresso"
            style={{ fontSize: "clamp(20px,2.4vw,28px)", lineHeight: 1.3, letterSpacing: "-0.01em" }}
          >
            &ldquo;The dough does its work in the dark.{" "}
            <span className="font-editorial text-cinnamon">Our job is only to come back.</span>&rdquo;
          </blockquote>

          <p className="font-news text-[17px] leading-[1.65] text-cocoa">
            We&apos;ve since spread this across the bakery — the croissants get their bench rest, the bánh mì gets
            its second proof, the cakes get the night they need. Nothing leaves the kitchen in a rush.
          </p>
        </article>

        {/* Right TOC */}
        <aside className="hidden pt-52 lg:block">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">In this piece</div>
          {[
            { n: "01", l: "The accident", a: true },
            { n: "02", l: "What changed" },
            { n: "03", l: "The bench rest" },
            { n: "04", l: "A reading list" },
          ].map((s) => (
            <div
              key={s.n}
              className="flex gap-2.5 border-t border-crust py-2"
              style={{ color: s.a ? "var(--espresso)" : "var(--caramel)", fontWeight: s.a ? 600 : 500 }}
            >
              <span
                className="font-mono text-[10.5px]"
                style={{ color: s.a ? "var(--cinnamon)" : "var(--caramel)" }}
              >
                {s.n}
              </span>
              <span className="text-[13px] leading-[1.3]">{s.l}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
