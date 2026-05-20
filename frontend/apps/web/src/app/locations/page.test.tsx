import { render, screen, cleanup } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: /our locations/i })).toBeInTheDocument();
  });

  it("shows location cards with addresses", () => {
    render(<LocationsPage />);
    expect(screen.getByText("Bakerio Nguyễn Huệ")).toBeInTheDocument();
    expect(screen.getByText("45 Nguyễn Huệ, Bến Nghé, Quận 1")).toBeInTheDocument();
    expect(screen.getByText("Bakerio Phú Mỹ Hưng")).toBeInTheDocument();
  });

  it("has direction links for each location", () => {
    render(<LocationsPage />);
    const directionLinks = screen.getAllByRole("link", { name: /get directions/i });
    expect(directionLinks.length).toBe(2);
    expect(directionLinks[0]).toHaveAttribute("href", expect.stringContaining("google.com/maps/dir"));
    expect(directionLinks[0]).toHaveAttribute("target", "_blank");
  });

  it("shows opening hours for locations", () => {
    render(<LocationsPage />);
    const hours = screen.getAllByText("Mon–Sun 7:00–22:00");
    expect(hours.length).toBe(2);
  });

  it("shows the correct number of locations from mock data", () => {
    render(<LocationsPage />);
    const directionLinks = screen.getAllByRole("link", { name: /get directions/i });
    expect(directionLinks).toHaveLength(2);
  });

  it("displays phone or contact info section on the page", () => {
    render(<LocationsPage />);
    // Locations show addresses as contact info
    expect(screen.getByText("45 Nguyễn Huệ, Bến Nghé, Quận 1")).toBeInTheDocument();
    expect(screen.getByText("18 Nguyễn Lương Bằng, Tân Phú, Quận 7")).toBeInTheDocument();
  });
});
