import Image from "next/image";
import Link from "next/link";

interface Post {
  slug: string;
  image: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
}

interface RecentPostsProps {
  featuredPosts: Post[];
}

export function RecentPosts({ featuredPosts }: RecentPostsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {featuredPosts.map((post, i) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="bkr-lift group overflow-hidden rounded-sm border border-crust bg-white"
          aria-label={post.title}
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
            <h3 className="font-display text-[20px] leading-[1.15] tracking-tight text-espresso line-clamp-2">
              {post.title}
            </h3>
            <p className="mt-2 line-clamp-2 font-news text-[14px] text-cocoa min-h-[32px]">{post.excerpt}</p>
            {i === 0 && (
              <span className="mt-3 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cinnamon">
                Read on →
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
