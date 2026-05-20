import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@repo/api-client", () => ({
  getBranches: vi.fn().mockResolvedValue([
    { id: "1", name: "Bakerio Quận 1", address: "123 Đường ABC", region: "south" },
    { id: "2", name: "Bakerio Hoàn Kiếm", address: "456 Phố XYZ", region: "north" },
  ]),
}));

vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/store/cart", () => ({ useCartStore: () => vi.fn() }));

afterEach(cleanup);

describe("HomePage (branch selection)", () => {
  it("renders without crashing", async () => {
    const { container } = render(await Page());
    expect(container).toBeTruthy();
  });

  it("shows branch selection heading", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: /order from bakerio/i })).toBeInTheDocument();
  });

  it("displays branch names from API", async () => {
    render(await Page());
    expect(screen.getByText("Bakerio Quận 1")).toBeInTheDocument();
    expect(screen.getByText("Bakerio Hoàn Kiếm")).toBeInTheDocument();
  });
});
