import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { posts } from "@/data/posts";

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

  return (
    <article className="max-w-3xl mx-auto px-6 py-24">
      <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-caramel hover:text-golden transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Blog
      </Link>

      <span className="bg-butter text-cinnamon text-xs font-medium px-2.5 py-1 rounded-full">{post.category}</span>
      <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-espresso mt-4">{post.title}</h1>
      <time className="text-sm text-caramel mt-2 block">{new Date(post.date).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}</time>

      <div className="relative h-64 md:h-96 rounded-[10px] overflow-hidden mt-8">
        <Image src={post.image} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 720px" />
      </div>

      <div className="prose prose-lg mt-10 text-cocoa">
        <p>{post.excerpt}</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      </div>
    </article>
  );
}
