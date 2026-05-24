import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";

const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock("@repo/api-client", () => ({
  getOrderStats: vi.fn().mockResolvedValue({ lifetime: 47 }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "1", email: "test@example.com", display_name: "John Doe", full_name: "John Doe" },
    loading: false,
    logout: mockLogout,
  }),
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ProfilePage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfilePage", () => {
  it("renders without crashing", () => {
    const { container } = render(<ProfilePage />);
    expect(container).toBeTruthy();
  });

  it("shows user display name and email from auth context", () => {
    render(<ProfilePage />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("has sign out button", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("calls logout when Sign Out is clicked", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
