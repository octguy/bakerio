import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProduct } from "@repo/api-client";

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount),
}));

vi.mock("@repo/api-client", () => ({
  getProduct: vi.fn().mockResolvedValue({
    id: "1",
    name: "Bánh Mì",
    base_price: 25000,
    slug: "banh-mi",
    description: "Fresh baked bread",
    images: [{ url: "/img.jpg" }],
  }),
}));

import Page from "./page";

vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({}), usePathname: () => "" }));
vi.mock("../_components/add-to-cart", () => ({ AddToCartSection: () => <div data-testid="add-to-cart" /> }));

afterEach(cleanup);

describe("ProductDetailPage", () => {
  it("renders without crashing", async () => {
    const { container } = render(await Page({ params: Promise.resolve({ slug: "banh-mi" }) }));
    expect(container.querySelector("main")).toBeInTheDocument();
  });

  it("shows product name and description", async () => {
    render(await Page({ params: Promise.resolve({ slug: "banh-mi" }) }));
    expect(screen.getByText("Bánh Mì")).toBeInTheDocument();
    expect(screen.getByText("Fresh baked bread")).toBeInTheDocument();
  });

  it("shows product price formatted in VND", async () => {
    render(await Page({ params: Promise.resolve({ slug: "banh-mi" }) }));
    expect(screen.getByText(/25.000/)).toBeInTheDocument();
  });

  it("renders placeholder icon when no images exist", async () => {
    vi.mocked(getProduct).mockResolvedValueOnce({
      id: "2",
      name: "Placeholder Bánh",
      base_price: 15000,
      slug: "placeholder-banh",
      description: "No image",
      images: [],
    });
    const { container } = render(await Page({ params: Promise.resolve({ slug: "placeholder-banh" }) }));
    expect(container.querySelector("img")).toBeNull();
  });

  it("displays Product not found message when getProduct throws", async () => {
    vi.mocked(getProduct).mockRejectedValueOnce(new Error("API offline"));
    render(await Page({ params: Promise.resolve({ slug: "banh-mi" }) }));
    expect(screen.getByText("Product not found")).toBeInTheDocument();
  });
});
