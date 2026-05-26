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
    const { container } = render(<BlogPage />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("contains blog heading", () => {
    render(<BlogPage />);
    expect(screen.getByRole("heading", { level: 1, name: /stories/i })).toBeInTheDocument();
  });

  it("shows blog post cards with titles", () => {
    render(<BlogPage />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/test post one/i);
    expect(screen.getByRole("heading", { level: 3, name: /test post two/i })).toBeInTheDocument();
  });

  it("has links to individual blog posts", () => {
    render(<BlogPage />);
    const links = screen.getAllByRole("link");
    const linkOne = links.find(l => l.getAttribute("href") === "/blog/test-post-one");
    const linkTwo = links.find(l => l.getAttribute("href") === "/blog/test-post-two");
    expect(linkOne).toBeDefined();
    expect(linkTwo).toBeDefined();
  });

  it("blog posts have images with alt text", () => {
    render(<BlogPage />);
    expect(screen.getByAltText("Test Post One")).toBeInTheDocument();
    expect(screen.getByAltText("Test Post Two")).toBeInTheDocument();
  });

  it("blog posts show category and date metadata", () => {
    render(<BlogPage />);
    expect(screen.getByText(/tips/i)).toBeInTheDocument();
  });

  it("renders the correct number of blog posts from mock data", () => {
    render(<BlogPage />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });
});
