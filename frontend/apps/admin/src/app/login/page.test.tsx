import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockLogin = vi.fn();
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ login: mockLogin }) }));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

import LoginPage from "./page";

afterEach(cleanup);

describe("Admin Login Page", () => {
  it("renders the admin login heading", () => {
    render(<LoginPage />);
    expect(screen.getByText(/Bakerio Ops/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /welcome back, baker/i })).toBeInTheDocument();
  });

  it("has email and password inputs with labels", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("has a sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in to ops/i })).toBeInTheDocument();
  });

  it("redirects to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue(null);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "admin@bakerio.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to ops/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows error message on failed login", async () => {
    mockLogin.mockResolvedValue("Invalid credentials");
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to ops/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
