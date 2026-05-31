import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import VerifyEmailForm from "./verify-email-form";

beforeEach(() => {});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("VerifyEmailForm", () => {
  it("validates missing registration details", async () => {
    render(<VerifyEmailForm email="jane@test.com" userId="" />);
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: "123456" } });
    fireEvent.submit(screen.getByRole("button", { name: /verify email/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/registration details are missing/i);
    });
  });

  it("submits the backend verify payload and redirects to login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, verified: true, message: "verified successful" }),
      }),
    );
    render(<VerifyEmailForm email="jane@test.com" userId="user-123" />);
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: "123456" } });
    fireEvent.submit(screen.getByRole("button", { name: /verify email/i }).closest("form")!);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "verify", user_id: "user-123", otp: "123456" }),
        }),
      );
      expect(screen.getByText(/verified/i)).toBeInTheDocument();
    });
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/login");
      },
      { timeout: 1500 },
    );
  });

  it("shows backend verification errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Invalid or expired OTP" }),
      }),
    );

    render(<VerifyEmailForm email="jane@test.com" userId="user-123" />);
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: "123456" } });
    fireEvent.submit(screen.getByRole("button", { name: /verify email/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid or expired OTP");
    });
  });
});
