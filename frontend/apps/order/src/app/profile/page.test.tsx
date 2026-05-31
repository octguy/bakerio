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
  getMyProfile: vi.fn().mockResolvedValue({
    id: "p1",
    user_id: "1",
    display_name: "John Doe",
    phone: "",
    address: "",
    bio: "",
  }),
  updateMyProfile: vi.fn().mockImplementation(async (data) => ({
    id: "p1",
    user_id: "1",
    display_name: data.display_name ?? "John Doe",
    phone: data.phone ?? "",
    address: data.address ?? "",
    bio: data.bio ?? "",
  })),
  changePassword: vi.fn().mockResolvedValue(undefined),
  getOrderStats: vi.fn().mockResolvedValue({ lifetime: 88 }),
  getAddresses: vi.fn().mockResolvedValue([
    {
      id: "addr-distinctive",
      label: "Secret Base",
      address: "123 Adventure Lane",
      is_default: true,
    },
  ]),
  addAddress: vi.fn().mockImplementation(async (label, address) => ({
    id: "addr-new",
    label,
    address,
    is_default: false,
  })),
  removeAddress: vi.fn().mockResolvedValue(undefined),
  setDefaultAddress: vi.fn().mockResolvedValue([]),
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

  it("edits profile fields and persists them via updateMyProfile", async () => {
    const { updateMyProfile } = await import("@repo/api-client");
    render(<ProfilePage />);
    fireEvent.click(screen.getAllByRole("button", { name: "EDIT" })[0]);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "New Name" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+84 900 000 000" } });
    fireEvent.change(screen.getByLabelText(/^address$/i), { target: { value: "12 Hai Bà Trưng" } });
    fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: "Loves sourdough" } });
    fireEvent.change(screen.getByLabelText(/avatar url/i), { target: { value: "https://img.test/a.jpg" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(updateMyProfile).toHaveBeenCalledWith({
        display_name: "New Name",
        phone: "+84 900 000 000",
        address: "12 Hai Bà Trưng",
        bio: "Loves sourdough",
        avatar_url: "https://img.test/a.jpg",
      });
    });
    await waitFor(() => {
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    });
  });

  it("toggles push notifications preference", () => {
    render(<ProfilePage />);
    expect(screen.getByText("order updates on")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /push notifications/i }));
    expect(screen.getByText("muted")).toBeInTheDocument();
  });

  it("adds an address from the Addresses section", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.change(screen.getByLabelText(/delivery address/i), { target: { value: "45 Pasteur, District 1" } });
    fireEvent.click(screen.getByRole("button", { name: /save address/i }));

    await waitFor(() => {
      expect(screen.getByText("45 Pasteur, District 1")).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog", { name: /add address/i })).toBeNull();
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
