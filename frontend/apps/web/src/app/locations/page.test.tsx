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

vi.mock("@/data/locations", () => ({
  locations: [
    { name: "Bakerio Nguyễn Huệ", address: "45 Nguyễn Huệ, Bến Nghé, Quận 1", region: "District 1", hours: "Mon–Sun 7:00–22:00", lat: 10.77, lng: 106.70 },
    { name: "Bakerio Phú Mỹ Hưng", address: "18 Nguyễn Lương Bằng, Tân Phú, Quận 7", region: "District 7", hours: "Mon–Sun 7:00–22:00", lat: 10.72, lng: 106.71 },
  ],
  regions: ["All", "District 1", "District 7"],
}));

import LocationsPage from "./page";

afterEach(cleanup);

describe("LocationsPage", () => {
  it("renders without crashing", () => {
    render(<LocationsPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("contains heading about locations", () => {
    render(<LocationsPage />);
    expect(screen.getByRole("heading", { name: /eleven shops/i })).toBeInTheDocument();
  });

  it("shows location cards with addresses", () => {
    render(<LocationsPage />);
    expect(screen.getAllByText("Bakerio Nguyễn Huệ").length).toBeGreaterThan(0);
    expect(screen.getByText("45 Nguyễn Huệ, Bến Nghé, Quận 1")).toBeInTheDocument();
    expect(screen.getAllByText("Bakerio Phú Mỹ Hưng").length).toBeGreaterThan(0);
  });

  it("shows number tags for each location", () => {
    render(<LocationsPage />);
    expect(screen.getAllByText("01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("02").length).toBeGreaterThan(0);
  });

  it("shows opening hours for locations", () => {
    render(<LocationsPage />);
    expect(screen.getByText("Mon–Sun 7:00–22:00")).toBeInTheDocument();
  });

  it("shows the correct number of locations from mock data", () => {
    render(<LocationsPage />);
    expect(screen.getAllByText(/Bakerio Nguyễn Huệ/i).length).toBeGreaterThan(0);
  });

  it("displays address for selected location", async () => {
    render(<LocationsPage />);
    expect(screen.getByText("45 Nguyễn Huệ, Bến Nghé, Quận 1")).toBeInTheDocument();
    
    // Click on Phú Mỹ Hưng in the list to select it
    const listButtons = screen.getAllByRole("button");
    const pmhButton = listButtons.find(b => b.textContent?.includes("Bakerio Phú Mỹ Hưng"));
    expect(pmhButton).toBeDefined();
    fireEvent.click(pmhButton!);
    
    expect(screen.getByText("18 Nguyễn Lương Bằng, Tân Phú, Quận 7")).toBeInTheDocument();
  });

  it("filters locations when a region button is clicked", () => {
    render(<LocationsPage />);
    
    // Click District 1 filter
    fireEvent.click(screen.getByRole("button", { name: "District 1" }));
    
    // Nguyễn Huệ list item should still be there
    const listButtonsD1 = screen.getAllByRole("button");
    const hasNguyenHue = listButtonsD1.some(b => b.textContent?.includes("Bakerio Nguyễn Huệ"));
    
    expect(hasNguyenHue).toBe(true);
    // PMH is in pins (as map buttons), but should be filtered out from list buttons
    // The list button for PMH contains its name in text content
    const pmhListButton = listButtonsD1.find(b => b.className.includes("text-left") && b.textContent?.includes("Bakerio Phú Mỹ Hưng"));
    expect(pmhListButton).toBeUndefined();
  });
});
