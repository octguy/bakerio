import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { getProducts, getCategories } from "@repo/api-client";

const apiCategories = vi.hoisted(() => [
  { id: "cat-bread", name: "Bread", slug: "bread", sort_order: 1, is_active: true },
  { id: "cat-pastries", name: "Pastries", slug: "pastries", sort_order: 2, is_active: true },
  { id: "cat-drinks", name: "Drinks", slug: "drinks", sort_order: 3, is_active: true },
]);

const apiProducts = vi.hoisted(() => [
  {
    id: "p-sourdough",
    sku: "SDH-1",
    name: "Sourdough Loaf",
    slug: "sourdough-loaf",
    description: "48 hour ferment",
    base_price: 110000,
    unit: "loaf",
    is_active: true,
    category: apiCategories[0],
    allergens: ["Gluten"],
    images: [{ id: "img-1", url: "/sourdough.jpg", is_primary: true, sort_order: 0 }],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "p-croissant",
    sku: "CRO-1",
    name: "Butter Croissant",
    slug: "butter-croissant",
    description: "AOP butter",
    base_price: 48000,
    unit: "piece",
    is_active: true,
    category: apiCategories[1],
    allergens: ["Gluten", "Dairy"],
    images: [{ id: "img-2", url: "/croissant.jpg", is_primary: true, sort_order: 0 }],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "p-coffee",
    sku: "CFE-1",
    name: "Iced Latte",
    slug: "iced-latte",
    description: "Condensed milk",
    base_price: 42000,
    unit: "cup",
    is_active: true,
    category: apiCategories[2],
    allergens: ["Dairy"],
    images: [{ id: "img-3", url: "/latte.jpg", is_primary: true, sort_order: 0 }],
    created_at: "2026-01-01T00:00:00Z",
  },
]);

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock("@repo/api-client", () => ({
  getProducts: vi.fn().mockResolvedValue(apiProducts),
  getCategories: vi.fn().mockResolvedValue(apiCategories),
}));

vi.mock("@/lib/public-config", () => ({
  getOrderUrl: () => "https://order.bakerio.test",
}));

import MenuPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderMenuPage = async () => render(await MenuPage());

describe("MenuPage", () => {
  it("displays the menu heading", async () => {
    await renderMenuPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /menu/i })
    ).toBeInTheDocument();
  });

  it("renders products and category counts from api-client data", async () => {
    await renderMenuPage();
    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(getCategories).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Showing 3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Butter Croissant")).toBeInTheDocument();
    expect(screen.getByText("Sourdough Loaf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bread1/i })).toBeInTheDocument();
  });

  it("category filtering hides non-matching products", async () => {
    await renderMenuPage();

    fireEvent.click(screen.getByRole("button", { name: /bread1/i }));

    expect(screen.getByText("Showing 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Sourdough Loaf")).toBeInTheDocument();
    expect(screen.queryByText("Butter Croissant")).toBeNull();
    expect(screen.queryByText("Iced Latte")).toBeNull();
  });

  it("allergen filtering hides products without every selected allergen", async () => {
    await renderMenuPage();

    fireEvent.click(screen.getByRole("button", { name: "Dairy" }));

    expect(screen.getByText("Showing 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Butter Croissant")).toBeInTheDocument();
    expect(screen.getByText("Iced Latte")).toBeInTheDocument();
    expect(screen.queryByText("Sourdough Loaf")).toBeNull();
  });

  it("links order actions to the configured order app", async () => {
    await renderMenuPage();
    const orderLinks = screen.getAllByRole("link", { name: /order/i });

    expect(orderLinks).toHaveLength(3);
    expect(orderLinks[0]).toHaveAttribute("href", "https://order.bakerio.test");
  });

  it("renders the hero section with description text", async () => {
    await renderMenuPage();
    expect(screen.getByText(/refreshed daily/i)).toBeInTheDocument();
  });
});
