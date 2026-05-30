import type { Metadata } from "next";
import { posts } from "@/data/posts";
import { BlogListClient } from "./blog-list-client";

export const metadata: Metadata = {
  title: "Journal — Stories from the oven",
  description: "Essays on craft, recipes, and the people behind Bakerio. Published since mmxxiv.",
};

export default function BlogPage() {
  return (
    <div className="bg-cream text-espresso">
      <BlogListClient posts={posts} />
    </div>
  );
}
