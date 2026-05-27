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
  getOrderStats: vi.fn().mockResolvedValue({ lifetime: 88 }),
}));

vi.mock("@repo/api-client/mock/loyalty", () => ({
  getLoyalty: vi.fn().mockResolvedValue({
    balance: 1337,
    asMoney: 25000,
    progress: 0.75,
    tier: "Sourdough Master",
    nextTier: "Ultimate Baker",
    toNextTier: 500,
  }),
}));

vi.mock("@repo/api-client/mock/addresses", () => ({
  getAddresses: vi.fn().mockResolvedValue([
    {
      id: "addr-distinctive",
      label: "Secret Base",
      address: "123 Adventure Lane",
      is_default: true,
    },
  ]),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "1",
      email: "test@example.com",
      display_name: "John Doe",
      full_name: "John Doe",
    },
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

  it("does not show unsourced account metadata", () => {
    render(<ProfilePage />);
    expect(screen.queryByText(/member since May 2024/i)).toBeNull();
    expect(screen.queryByText("+84 901 234 567")).toBeNull();
    expect(screen.queryByText("Password")).toBeNull();
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

  it("displays loyalty, address, and lifetime orders from the mocked data layer", async () => {
    render(<ProfilePage />);

    // Assert loyalty points (balance) and tier
    await waitFor(() => {
      expect(screen.getByText("1,337")).toBeInTheDocument();
      expect(screen.getByText("Sourdough Master tier")).toBeInTheDocument();
    });

    // Assert lifetime orders count
    await waitFor(() => {
      expect(screen.getByText(/88 orders/i)).toBeInTheDocument();
    });

    // Assert fetched address label and detail
    await waitFor(() => {
      expect(screen.getByText("Secret Base")).toBeInTheDocument();
      expect(screen.getByText("123 Adventure Lane")).toBeInTheDocument();
    });
  });
});
