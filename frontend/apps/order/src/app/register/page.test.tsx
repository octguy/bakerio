import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const mockRegister = vi.fn();
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ register: mockRegister }) }));

import RegisterPage from "./page";

beforeEach(() => {
  mockRegister.mockResolvedValue({ error: null, userId: "user-123", email: "jane@test.com" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RegisterPage", () => {
  it("renders the register heading", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /let's set you/i })).toBeInTheDocument();
  });

  it("renders name, email, and password inputs with labels", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty fields", async () => {
    render(<RegisterPage />);
    const form = screen.getByRole("button", {
      name: /send verification code/i,
    });
    const formEl = form.closest("form")!;
    fireEvent.submit(formEl);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it("has a submit button and a link to login", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("button", { name: /send verification code/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  it("calls register with correct args on valid submit", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });

    // Check agreed checkbox
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.submit(screen.getByRole("button", { name: /send verification code/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("jane@test.com", "secret123", "Jane Doe");
    });
  });

  it("redirects to verify email after successful registration", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });

    // Check agreed checkbox
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.submit(screen.getByRole("button", { name: /send verification code/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/verify-email?user_id=user-123&email=jane%40test.com");
    });
  });

  it("displays error message when registration fails", async () => {
    mockRegister.mockResolvedValue({ error: "Email already taken" });
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });

    // Check agreed checkbox
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.submit(screen.getByRole("button", { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already taken")).toBeInTheDocument();
    });
  });
});
