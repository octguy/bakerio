import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
let mockSearch = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockLogin = vi.fn();
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ login: mockLogin }) }));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

import LoginPage from "./page";

beforeEach(() => {
  mockSearch = "";
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("Admin Login Page", () => {
  it("renders the admin login heading", () => {
    render(<LoginPage />);
    expect(screen.getByText(/Bakerio Ops/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /welcome back, baker/i }),
    ).toBeInTheDocument();
  });

  it("has email and password inputs with labels", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("has a sign in button", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /sign in to ops/i }),
    ).toBeInTheDocument();
  });

  it("does not show the UI-only remember device checkbox", () => {
    render(<LoginPage />);
    expect(
      screen.queryByLabelText(/remember this device/i),
    ).not.toBeInTheDocument();
  });

  it("has a disabled forgot password button with accessible description", () => {
    render(<LoginPage />);
    const forgotButton = screen.getByRole("button", {
      name: "Forgot password? Reset is unavailable/coming soon.",
    });

    expect(forgotButton).toBeDisabled();
  });

  it("redirects to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue(null);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "admin@bakerio.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in to ops/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("redirects to next param on successful login", async () => {
    mockSearch = "next=%2Forders";
    mockLogin.mockResolvedValue(null);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "admin@bakerio.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in to ops/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/orders");
    });
  });

  it("shows error message on failed login", async () => {
    mockLogin.mockResolvedValue("Invalid credentials");
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in to ops/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("shows error message when login rejects", async () => {
    mockLogin.mockRejectedValue(new Error("Network failed"));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in to ops/i }));

    await waitFor(() => {
      expect(screen.getByText("Network failed")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in to ops/i }),
      ).not.toBeDisabled();
    });
  });
});
