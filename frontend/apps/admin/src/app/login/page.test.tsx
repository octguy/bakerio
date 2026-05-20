import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockLogin = vi.fn();
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ login: mockLogin }) }));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h1>{children}</h1>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import LoginPage from "./page";

afterEach(cleanup);

describe("Admin Login Page", () => {
  it("renders the admin login heading", () => {
    render(<LoginPage />);
    expect(screen.getByText("Bakerio Admin")).toBeInTheDocument();
  });

  it("has email and password inputs with labels", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("has a sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("redirects to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue(null);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@bakerio.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows error message on failed login", async () => {
    mockLogin.mockResolvedValue("Invalid credentials");
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
