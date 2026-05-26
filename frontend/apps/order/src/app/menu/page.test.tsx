import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { getProducts } from "@repo/api-client";

vi.mock("@repo/api-client", () => ({
  getProducts: vi.fn().mockResolvedValue([
    {
      id: "1",
      name: "Bánh Mì",
      base_price: 25000,
      slug: "banh-mi",
      images: [],
      category: { id: "c1" },
    },
    {
      id: "2",
      name: "Croissant",
      base_price: 35000,
      slug: "croissant",
      images: [],
      category: { id: "c1" },
    },
  ]),
  getCategories: vi.fn().mockResolvedValue([{ id: "c1", name: "Bread" }]),
}));

vi.mock("./_components/menu-grid", () => ({
  MenuGrid: ({ products }: { products: { id: string; name: string }[] }) => (
    <div data-testid="menu-grid">
      {products.map((p) => (
        <span key={p.id}>{p.name}</span>
      ))}
    </div>
  ),
}));

import MenuPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MenuPage", () => {
  it("renders without crashing", async () => {
    const { container } = render(await MenuPage());
    expect(container).toBeTruthy();
  });

  it("shows menu details and banner", async () => {
    render(await MenuPage());
    expect(screen.getByText(/today's batch/i)).toBeInTheDocument();
    expect(screen.getByText(/sourdough/i)).toBeInTheDocument();
  });

  it("displays product names", async () => {
    render(await MenuPage());
    expect(screen.getByText("Bánh Mì")).toBeInTheDocument();
    expect(screen.getByText("Croissant")).toBeInTheDocument();
  });

  it("shows a retry state when products fail to load", async () => {
    vi.mocked(getProducts).mockRejectedValueOnce(new Error("offline"));
    render(await MenuPage());

    expect(screen.getByRole("heading", { name: /menu is unavailable/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /retry/i }).getAttribute("href")).toBe("/menu");
    expect(screen.queryByTestId("menu-grid")).toBeNull();
  });
});
