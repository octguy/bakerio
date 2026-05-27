import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

import AboutPage, { metadata } from "./page";

afterEach(cleanup);

describe("AboutPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<AboutPage />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("exports correct metadata", () => {
    expect(metadata.title).toBe("About — One oven, eleven shops");
    expect(metadata.description).toContain("Bakerio started in 2024 with one oven on Lê Lợi");
  });

  it("renders with correct semantic landmark structure and hierarchy", () => {
    const { container } = render(<AboutPage />);
    
    // Check that there is a main division/structure
    expect(container.querySelector(".bg-cream")).toBeInTheDocument();
    
    // Check that it contains section elements
    const sections = container.querySelectorAll("section");
    expect(sections.length).toBe(3);

    // Check that the second section contains article elements
    const articles = sections[1]?.querySelectorAll("article");
    expect(articles?.length).toBe(3);

    // Check heading hierarchy levels
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    
    const h3s = screen.getAllByRole("heading", { level: 3 });
    expect(h3s.length).toBe(3);
  });
});
