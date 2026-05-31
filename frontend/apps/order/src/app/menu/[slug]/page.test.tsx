import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProduct } from "@repo/api-client";

const productBySlug = vi.hoisted(() => ({
  "banh-mi": {
    id: "p-banh-mi",
    sku: "BMI-1",
    name: "Bánh Mì",
    base_price: 25000,
    slug: "banh-mi",
    description: "Fresh baked bread",
    unit: "piece",
    is_active: true,
    images: [{ id: "img-1", url: "/img.jpg", is_primary: true, sort_order: 0 }],
    created_at: "2026-01-01T00:00:00Z",
  },
}));

vi.mock("@/lib/format", () => ({
  formatVND: (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount),
}));

vi.mock("@repo/api-client", () => ({
  getProduct: vi.fn(async (slug: string) => {
    const product = productBySlug[slug as keyof typeof productBySlug];
    if (!product) throw new Error(`No product for ${slug}`);
    return product;
  }),
}));

import Page from "./page";

vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({}), usePathname: () => "" }));

const mockAddToCartSection = vi.hoisted(() =>
  vi.fn(({ product }: any) => <div data-testid="add-to-cart" data-product-id={product.id} />),
);

vi.mock("../_components/add-to-cart", () => ({ AddToCartSection: mockAddToCartSection }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProductDetailPage", () => {
  it("looks up the route slug and passes the loaded product to AddToCartSection", async () => {
    render(await Page({ params: Promise.resolve({ slug: "banh-mi" }) }));

    expect(getProduct).toHaveBeenCalledWith("banh-mi");
    expect(mockAddToCartSection).toHaveBeenCalledWith(
      expect.objectContaining({
        product: expect.objectContaining({ id: "p-banh-mi", slug: "banh-mi" }),
      }),
      undefined,
    );
    expect(screen.getByTestId("add-to-cart")).toHaveAttribute("data-product-id", "p-banh-mi");
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
      sku: "BMI-2",
      name: "Placeholder Bánh",
      base_price: 15000,
      slug: "placeholder-banh",
      description: "No image",
      unit: "piece",
      is_active: true,
      images: [],
      created_at: "2026-01-01T00:00:00Z",
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
