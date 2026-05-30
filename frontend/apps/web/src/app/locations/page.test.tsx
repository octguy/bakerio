import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/components/ui/ScrollReveal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/GoogleMap", () => ({
  default: () => <div data-testid="google-map" />,
}));

vi.mock("@repo/api-client", () => ({
  getBranches: vi.fn().mockResolvedValue([
    { id: "br-1", name: "Bakerio Nguyễn Huệ", address: "45 Nguyễn Huệ, Bến Nghé, Quận 1", status: "active", lat: 10.77, lng: 106.70 },
    { id: "br-2", name: "Bakerio Phú Mỹ Hưng", address: "18 Nguyễn Lương Bằng, Tân Phú, Quận 7", status: "active", lat: 10.72, lng: 106.71 },
  ]),
}));

import LocationsPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LocationsPage", () => {
  it("renders the page heading", () => {
    render(<LocationsPage />);
    expect(screen.getByRole("heading", { name: /shops/i })).toBeInTheDocument();
  });

  it("shows location cards with addresses", async () => {
    render(<LocationsPage />);
    expect((await screen.findAllByText("Bakerio Nguyễn Huệ")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("45 Nguyễn Huệ, Bến Nghé, Quận 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bakerio Phú Mỹ Hưng").length).toBeGreaterThan(0);
  });

  it("displays address for selected location", async () => {
    render(<LocationsPage />);
    expect((await screen.findAllByText("45 Nguyễn Huệ, Bến Nghé, Quận 1")).length).toBeGreaterThan(0);

    // Click on Phú Mỹ Hưng in the list to select it
    const listButtons = screen.getAllByRole("button");
    const pmhButton = listButtons.find((b) => b.textContent?.includes("Bakerio Phú Mỹ Hưng"));
    if (pmhButton) fireEvent.click(pmhButton);

    expect((await screen.findAllByText("18 Nguyễn Lương Bằng, Tân Phú, Quận 7")).length).toBeGreaterThan(0);
  });

  it("updates the selected callout when a shop is clicked", async () => {
    render(<LocationsPage />);

    const listButtons = await screen.findAllByRole("button");
    const selectedButton = listButtons.find(
      (b) => b.className.includes("text-left") && b.textContent?.includes("Phú Mỹ Hưng"),
    );

    if (selectedButton) fireEvent.click(selectedButton);

    expect((await screen.findAllByText("18 Nguyễn Lương Bằng, Tân Phú, Quận 7")).length).toBeGreaterThan(0);
  });

  it("shows number tags for each location", async () => {
    render(<LocationsPage />);
    expect((await screen.findAllByText("01")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("02").length).toBeGreaterThan(0);
  });

  it("shows opening hours for locations", async () => {
    render(<LocationsPage />);
    expect(await screen.findByText("Mon–Sun 7:00–22:00")).toBeInTheDocument();
  });

  it("displays address for selected location", async () => {
    render(<LocationsPage />);
    expect(await screen.findByText("45 Nguyễn Huệ, Bến Nghé, Quận 1")).toBeInTheDocument();
    
    // Click on Phú Mỹ Hưng in the list to select it
    const listButtons = screen.getAllByRole("button");
    const pmhButton = listButtons.find(b => b.textContent?.includes("Bakerio Phú Mỹ Hưng"));
    expect(pmhButton).toBeDefined();
    fireEvent.click(pmhButton!);
    
    expect(screen.getByText("18 Nguyễn Lương Bằng, Tân Phú, Quận 7")).toBeInTheDocument();
  });

  it("updates the selected callout when a shop is clicked", async () => {
    render(<LocationsPage />);

    const listButtons = screen.getAllByRole("button");
    const selectedButton = listButtons.find(
      (b) => b.className.includes("text-left") && b.textContent?.includes("Bakerio Phú Mỹ Hưng"),
    );

    expect(selectedButton).toBeDefined();
    fireEvent.click(selectedButton!);
    expect(screen.getByText("18 Nguyễn Lương Bằng, Tân Phú, Quận 7")).toBeInTheDocument();
  });
});
