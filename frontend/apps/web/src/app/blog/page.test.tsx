import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/ScrollReveal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/data/posts", () => ({
  posts: [
    {
      slug: "test-post-one",
      title: "Test Post One",
      excerpt: "Excerpt one",
      date: "2024-01-01",
      image: "/img1.jpg",
      category: "News",
    },
    {
      slug: "test-post-two",
      title: "Test Post Two",
      excerpt: "Excerpt two",
      date: "2024-02-01",
      image: "/img2.jpg",
      category: "Tips",
    },
  ],
}));

import BlogPage from "./page";

afterEach(cleanup);

describe("BlogPage", () => {
  it("renders without crashing", () => {
    render(<BlogPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("contains blog heading", () => {
    render(<BlogPage />);
    expect(screen.getByRole("heading", { level: 1, name: /stories & news/i })).toBeInTheDocument();
  });

  it("shows blog post cards with titles", () => {
    render(<BlogPage />);
    expect(screen.getByText("Test Post One")).toBeInTheDocument();
    expect(screen.getByText("Test Post Two")).toBeInTheDocument();
  });

  it("has links to individual blog posts", () => {
    render(<BlogPage />);
    expect(screen.getByRole("link", { name: /test post one/i })).toHaveAttribute("href", "/blog/test-post-one");
    expect(screen.getByRole("link", { name: /test post two/i })).toHaveAttribute("href", "/blog/test-post-two");
  });

  it("blog posts have images with alt text", () => {
    render(<BlogPage />);
    expect(screen.getByAltText("Test Post One")).toBeInTheDocument();
    expect(screen.getByAltText("Test Post Two")).toBeInTheDocument();
  });

  it("blog posts show category and date metadata", () => {
    render(<BlogPage />);
    expect(screen.getByText("News")).toBeInTheDocument();
    expect(screen.getByText("Tips")).toBeInTheDocument();
    const dates = screen.getAllByText(/2024/);
    expect(dates.length).toBe(2);
  });

  it("renders the correct number of blog posts from mock data", () => {
    render(<BlogPage />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });
});
