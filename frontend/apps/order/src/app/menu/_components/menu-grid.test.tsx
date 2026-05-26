import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Category, Product } from "@repo/api-client";
import { MenuGrid } from "./menu-grid";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) => `${amount.toLocaleString("vi-VN")}₫`,
}));

const mockAddItem = vi.hoisted(() => vi.fn());

vi.mock("@/store/cart", () => ({
  useCartStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({
      items: [],
      addItem: mockAddItem,
    }),
  ),
}));

const categories: Category[] = [
  { id: "bread", name: "Bread", slug: "bread", sort_order: 1, is_active: true },
  {
    id: "pastry",
    name: "Pastry",
    slug: "pastry",
    sort_order: 2,
    is_active: true,
  },
];

const products: Product[] = [
  {
    id: "p1",
    sku: "BREAD-1",
    name: "Bánh Mì",
    slug: "banh-mi",
    description: "Crisp baguette sandwich",
    base_price: 25000,
    unit: "piece",
    is_active: true,
    category: categories[0],
    images: [],
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "p2",
    sku: "PASTRY-1",
    name: "Croissant",
    slug: "croissant",
    description: "Buttery pastry",
    base_price: 35000,
    unit: "piece",
    is_active: true,
    category: categories[1],
    images: [],
    created_at: "2024-01-01T00:00:00Z",
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MenuGrid", () => {
  it("filters products with the search input", () => {
    render(<MenuGrid products={products} categories={categories} />);

    fireEvent.change(screen.getByLabelText(/search menu/i), {
      target: { value: "croissant" },
    });

    expect(screen.getByText("Croissant")).toBeTruthy();
    expect(screen.queryByText("Bánh Mì")).toBeNull();
  });

  it("clears the search query", () => {
    render(<MenuGrid products={products} categories={categories} />);

    fireEvent.change(screen.getByLabelText(/search menu/i), {
      target: { value: "croissant" },
    });
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));

    expect(screen.getByText("Croissant")).toBeTruthy();
    expect(screen.getByText("Bánh Mì")).toBeTruthy();
  });
});
