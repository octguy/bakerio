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
  ],
}));

import BlogPostPage from "./page";

afterEach(cleanup);

describe("BlogPostPage", () => {
  it("renders without crashing with a valid slug", async () => {
    const { container } = render(await BlogPostPage({ params: Promise.resolve({ slug: "test-post" }) }));
    expect(container.querySelector("article")).toBeInTheDocument();
  });

  it("shows blog post title and content", async () => {
    render(await BlogPostPage({ params: Promise.resolve({ slug: "test-post" }) }));
    expect(screen.getByText("Test Blog Title")).toBeInTheDocument();
    expect(screen.getByText("Test excerpt content")).toBeInTheDocument();
    expect(screen.getByText("Testing")).toBeInTheDocument();
  });

  it("has proper article structure with image, time, and back link", async () => {
    render(await BlogPostPage({ params: Promise.resolve({ slug: "test-post" }) }));
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Test Blog Title");
    expect(screen.getByRole("link", { name: /back to blog/i })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("time") || screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("calls notFound for an invalid slug", async () => {
    await expect(BlogPostPage({ params: Promise.resolve({ slug: "nonexistent" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
