import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ContactPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<ContactPage />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText(/hear from you/i)).toBeInTheDocument();
  });

  it("renders form inputs with associated labels", () => {
    render(<ContactPage />);
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
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

  it("shows a configuration error when no contact endpoint is configured", () => {
    render(<ContactPage />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi there" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/contact form is not configured yet/i);
  });

  it("shows email-specific error for invalid email format", () => {
    render(<ContactPage />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Subject is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Message is required")).not.toBeInTheDocument();
  });

  it("hides the form after successful submission", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONTACT_ENDPOINT", "https://example.com/contact");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(<ContactPage />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi there" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("Thank you.")).toBeInTheDocument();
    });
    expect(screen.getByText(/we'll write back/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
  });
});
