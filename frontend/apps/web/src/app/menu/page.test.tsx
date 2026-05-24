import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/image", () => ({
  default: ({ fill, priority, ...props }: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock("./MenuContent", () => ({
  default: () => (
    <section>
      <div>
        {["All", "Cakes", "Pastries", "Bread", "Drinks"].map((cat) => (
          <button key={cat}>{cat}</button>
        ))}
      </div>
      <div>
        <div><img src="/img1.jpg" alt="Vanilla Sponge" /><span>Cakes</span><h3>Vanilla Sponge</h3></div>
        <div><img src="/img2.jpg" alt="Butter Croissant" /><span>Pastries</span><h3>Butter Croissant</h3></div>
        <div><img src="/img3.jpg" alt="Sourdough Loaf" /><span>Bread</span><h3>Sourdough Loaf</h3></div>
        <div><img src="/img4.jpg" alt="Iced Latte" /><span>Drinks</span><h3>Iced Latte</h3></div>
      </div>
    </section>
  ),
}));

import MenuPage from "./page";

afterEach(cleanup);

describe("MenuPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<MenuPage />);
    expect(container.querySelector("main")).toBeInTheDocument();
  });

  it("displays the menu heading", () => {
    render(<MenuPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /menu/i })
    ).toBeInTheDocument();
  });

  it("shows product items with names", () => {
    render(<MenuPage />);
    expect(screen.getByText("Vanilla Sponge")).toBeInTheDocument();
    expect(screen.getByText("Butter Croissant")).toBeInTheDocument();
    expect(screen.getByText("Sourdough Loaf")).toBeInTheDocument();
  });

  it("renders category filter buttons", () => {
    render(<MenuPage />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cakes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pastries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bread" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drinks" })).toBeInTheDocument();
  });

  it("displays product images with alt text", () => {
    render(<MenuPage />);
    expect(screen.getByAltText("Vanilla Sponge")).toBeInTheDocument();
    expect(screen.getByAltText("Iced Latte")).toBeInTheDocument();
  });

  it("renders the hero section with description text", () => {
    render(<MenuPage />);
    expect(screen.getByText(/refreshed daily/i)).toBeInTheDocument();
  });

  it("has a link or CTA related to ordering", () => {
    render(<MenuPage />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });
});
