import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: () => ({ current: null }),
}));

import ContactPage from "./page";

afterEach(cleanup);

describe("ContactPage", () => {
  it("renders without crashing", () => {
    render(<ContactPage />);
    expect(screen.getByText("Get in Touch")).toBeInTheDocument();
  });

  it("renders form inputs with associated labels", () => {
    render(<ContactPage />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<ContactPage />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty fields", () => {
    render(<ContactPage />);
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    expect(screen.getByText("Subject is required")).toBeInTheDocument();
    expect(screen.getByText("Message is required")).toBeInTheDocument();
  });

  it("shows success message after valid form submission", () => {
    render(<ContactPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi there" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText(/thank you! your message has been sent/i)).toBeInTheDocument();
  });

  it("shows email-specific error for invalid email format", () => {
    render(<ContactPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Subject is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Message is required")).not.toBeInTheDocument();
  });

  it("hides the form after successful submission", () => {
    render(<ContactPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi there" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
  });
});
