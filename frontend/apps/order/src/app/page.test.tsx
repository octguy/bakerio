import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBranches } from "@repo/api-client";
import Page from "./page";

const mockPush = vi.fn();
const mockSetBranch = vi.fn();

vi.mock("@repo/api-client", () => ({
  getBranches: vi.fn().mockResolvedValue([
    { id: "1", name: "Bakerio Quận 1", address: "123 Đường ABC", region: "south" },
    { id: "2", name: "Bakerio Hoàn Kiếm", address: "456 Phố XYZ", region: "north" },
    { id: "3", name: "Bakerio Miền Đông", address: "789 Đường LMN", region: "east" },
  ]),
}));

vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("@/store/cart", () => ({ useCartStore: (_selector: any) => mockSetBranch }));

afterEach(cleanup);

describe("HomePage (branch selection)", () => {
  it("renders without crashing", async () => {
    const { container } = render(await Page());
    expect(container).toBeTruthy();
  });

  it("shows branch selection heading", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: /where shall/i })).toBeInTheDocument();
  });

  it("displays branch names from API", async () => {
    render(await Page());
    expect(screen.getByText("Bakerio Quận 1")).toBeInTheDocument();
    expect(screen.getByText("Bakerio Hoàn Kiếm")).toBeInTheDocument();
  });

  it("handles error during getBranches gracefully (instanceof Error)", async () => {
    vi.mocked(getBranches).mockRejectedValueOnce(new Error("Connection timeout"));
    render(await Page());
    expect(screen.getByText("Connection timeout")).toBeInTheDocument();
  });

  it("handles error during getBranches gracefully (non-Error throw)", async () => {
    vi.mocked(getBranches).mockRejectedValueOnce("Simple error string");
    render(await Page());
    expect(screen.getByText("Failed to load branches")).toBeInTheDocument();
  });

  it("selects a branch and redirects to menu when a branch card is clicked", async () => {
    render(await Page());
    fireEvent.click(screen.getByText("Bakerio Quận 1"));
    expect(mockSetBranch).toHaveBeenCalledWith("1");
    expect(mockPush).toHaveBeenCalledWith("/menu");
  });
});
