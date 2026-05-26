import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockNotFound = vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
vi.mock("next/navigation", () => ({
  notFound: () => { mockNotFound(); },
}));

const mockBlogPostActions = vi.hoisted(() =>
  vi.fn(({ slug, title }: { slug: string; title: string }) => (
    <div data-testid="post-actions" data-slug={slug} data-title={title} />
  )),
);

vi.mock("./BlogPostActions", () => ({
  default: mockBlogPostActions,
}));

vi.mock("@/data/posts", () => ({
  posts: [
    {
      slug: "test-post",
      title: "Test Blog Title",
      excerpt: "Test excerpt content",
      date: "2024-12-01",
      image: "/test.jpg",
      category: "Testing",
    },
    {
      slug: "second-post",
      title: "Second Blog Title",
      excerpt: "Second excerpt content",
      date: "2024-12-02",
      image: "/second.jpg",
      category: "Updates",
    },
  ],
}));

import BlogPostPage, { generateStaticParams, generateMetadata } from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BlogPostPage", () => {
  it("selects the matching slug and passes it to post actions", async () => {
    render(await BlogPostPage({ params: Promise.resolve({ slug: "test-post" }) }));

    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(mockBlogPostActions).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "test-post", title: "Test Blog Title" }),
      undefined,
    );
    expect(screen.getByTestId("post-actions")).toHaveAttribute("data-slug", "test-post");
  });

  it("shows blog post title and content", async () => {
    render(await BlogPostPage({ params: Promise.resolve({ slug: "test-post" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Test\s+Blog\s+Title/i);
    expect(screen.getByText(/Test excerpt content/i)).toBeInTheDocument();
    expect(screen.getByText(/Testing/i)).toBeInTheDocument();
  });

  it("has proper article structure with image, time, and back link", async () => {
    render(await BlogPostPage({ params: Promise.resolve({ slug: "test-post" }) }));
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Test Blog Title");
    expect(screen.getByRole("link", { name: /back to/i })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("time") || screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("calls notFound for an invalid slug", async () => {
    await expect(BlogPostPage({ params: Promise.resolve({ slug: "nonexistent" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("generates static params", () => {
    const params = generateStaticParams();
    expect(params).toEqual([{ slug: "test-post" }, { slug: "second-post" }]);
  });

  it("generates metadata for valid and invalid slugs", async () => {
    const metaValid = await generateMetadata({ params: Promise.resolve({ slug: "test-post" }) });
    expect(metaValid).toEqual({ title: "Test Blog Title", description: "Test excerpt content" });

    const metaInvalid = await generateMetadata({ params: Promise.resolve({ slug: "nonexistent" }) });
    expect(metaInvalid).toEqual({});
  });
});
