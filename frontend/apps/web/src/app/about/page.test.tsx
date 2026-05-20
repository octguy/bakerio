import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/ui/ScrollReveal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/SectionHeader", () => ({
  default: ({ title, script }: { title: string; script?: string }) => (
    <div>
      {script && <p>{script}</p>}
      <h2>{title}</h2>
    </div>
  ),
}));

vi.mock("@/components/cards/TeamMemberCard", () => ({
  default: ({ name, role }: { name: string; role: string }) => (
    <div>
      <p>{name}</p>
      <p>{role}</p>
    </div>
  ),
}));

vi.mock("@/data/team", () => ({
  team: [
    { name: "Test Baker", role: "Head Baker", initials: "TB", bio: "Bio" },
  ],
}));

import AboutPage from "./page";

afterEach(cleanup);

describe("AboutPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<AboutPage />);
    expect(container.querySelector("main")).toBeInTheDocument();
  });

  it("displays the hero heading about the bakery", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /baked with heart since 2024/i })
    ).toBeInTheDocument();
  });

  it("renders the origin story section", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /how it all began/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/small kitchen in saigon/i)).toBeInTheDocument();
  });

  it("renders core values", () => {
    render(<AboutPage />);
    expect(screen.getByText("Craft")).toBeInTheDocument();
    expect(screen.getByText("Freshness")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("renders company stats", () => {
    render(<AboutPage />);
    expect(screen.getByText("10+")).toBeInTheDocument();
    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getByText("50+")).toBeInTheDocument();
  });

  it("renders the join our team CTA with contact link", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /join our team/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute(
      "href",
      "/contact"
    );
  });
});
