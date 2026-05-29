import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { getProducts } from "@repo/api-client";

const apiCategories = vi.hoisted(() => [
  { id: "c-bread", name: "Bread", slug: "bread", sort_order: 1, is_active: true },
  { id: "c-pastry", name: "Pastry", slug: "pastry", sort_order: 2, is_active: true },
]);

const apiProducts = vi.hoisted(() => [
  {
    id: "p-banh-mi",
    name: "Bánh Mì",
    price: 25000,
    slug: "banh-mi",
    category_id: "c-bread",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "p-croissant",
    name: "Croissant",
    price: 35000,
    slug: "croissant",
    category_id: "c-pastry",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
]);

vi.mock("@repo/api-client", () => ({
  getProducts: vi.fn().mockResolvedValue(apiProducts),
  getCategories: vi.fn().mockResolvedValue(apiCategories),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
    toString: vi.fn().mockReturnValue(""),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-view-transitions", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useTransitionRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ fill, ...props }: Record<string, unknown>) => {
    void fill;
    return <img {...props} />;
  },
}));

vi.mock("lucide-react", () => ({
  Croissant: () => <svg data-testid="croissant-icon" />,
}));

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) => `${amount.toLocaleString("vi-VN")}₫`,
}));

const mockAddItem = vi.hoisted(() => vi.fn());

vi.mock("@/store/cart", () => ({
  useCartStore: vi.fn((selector: (state: any) => unknown) =>
    selector({
      items: [],
      addItem: mockAddItem,
    }),
  ),
}));

import MenuPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MenuPage", () => {
  it("passes fetched products into the real menu grid", async () => {
    render(await MenuPage());

    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Bánh Mì")).toBeInTheDocument();
    expect(screen.getByText("Croissant")).toBeInTheDocument();
  });

  it("filters the real grid by search text", async () => {
    render(await MenuPage());

    fireEvent.change(screen.getByLabelText(/search menu/i), {
      target: { value: "croissant" },
    });

    expect(screen.getByText("Croissant")).toBeInTheDocument();
    expect(screen.queryByText("Bánh Mì")).toBeNull();
  });

  it("filters the real grid by category", async () => {
    render(await MenuPage());

    fireEvent.click(screen.getByRole("button", { name: /pastry/i }));

    expect(screen.getByText("Croissant")).toBeInTheDocument();
    expect(screen.queryByText("Bánh Mì")).toBeNull();
  });

  it("shows a retry state when products fail to load", async () => {
    vi.mocked(getProducts).mockRejectedValueOnce(new Error("offline"));
    render(await MenuPage());

    expect(screen.getByRole("heading", { name: /menu is unavailable/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /retry/i }).getAttribute("href")).toBe("/menu");
    expect(screen.queryByLabelText(/search menu/i)).toBeNull();
  });
});
