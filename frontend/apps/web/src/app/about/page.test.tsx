import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

import AboutPage from "./page";

afterEach(cleanup);

describe("AboutPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<AboutPage />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("displays the hero heading about the bakery", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /we started/i })
    ).toBeInTheDocument();
  });

  it("renders the origin story section", () => {
    render(<AboutPage />);
    expect(screen.getByText(/Linh and Khoa opened a 14m² shop/i)).toBeInTheDocument();
  });

  it("renders core pillars", () => {
    render(<AboutPage />);
    expect(screen.getByText("Sourdough")).toBeInTheDocument();
    expect(screen.getByText("Pâtisserie")).toBeInTheDocument();
    expect(screen.getByText("Bánh mì")).toBeInTheDocument();
  });

  it("renders company stats", () => {
    render(<AboutPage />);
    expect(screen.getByText("mmxxiv")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("46")).toBeInTheDocument();
  });

  it("renders the pull-quote section", () => {
    render(<AboutPage />);
    expect(screen.getByText(/the trick isn't the crust/i)).toBeInTheDocument();
    expect(screen.getByText("Linh Phạm")).toBeInTheDocument();
  });
});
