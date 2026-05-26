import { describe, expect, it } from "vitest";
import { getTokenRoles, hasStaffAccess } from "./route";

// Helper to build a JWT-like token string
function buildToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "signature";
  return `${header}.${encodedPayload}.${signature}`;
}

describe("Admin Route Auth Gating Logic", () => {
  describe("hasStaffAccess", () => {
    it("returns true for allowed staff roles", () => {
      expect(hasStaffAccess(["super_admin"])).toBe(true);
      expect(hasStaffAccess(["product_manager"])).toBe(true);
      expect(hasStaffAccess(["branch_manager"])).toBe(true);
      expect(hasStaffAccess(["branch_staff"])).toBe(true);
    });

    it("returns true for mixed arrays containing at least one staff role", () => {
      expect(hasStaffAccess(["customer", "super_admin"])).toBe(true);
      expect(hasStaffAccess(["branch_staff", "guest"])).toBe(true);
    });

    it("returns false for customer, guest, empty array, or customer/guest combinations", () => {
      // These assertions will FAIL if STAFF_ROLES is widened to include customer or guest,
      // or if the staff access gating logic is removed/always returns true.
      expect(hasStaffAccess(["customer"])).toBe(false);
      expect(hasStaffAccess(["guest"])).toBe(false);
      expect(hasStaffAccess([])).toBe(false);
      expect(hasStaffAccess(["customer", "guest"])).toBe(false);
    });
  });

  describe("getTokenRoles", () => {
    it("extracts roles correctly from a valid token", () => {
      const token = buildToken({ roles: ["branch_staff", "product_manager"] });
      expect(getTokenRoles(token)).toEqual(["branch_staff", "product_manager"]);
    });

    it("returns empty array for a token with no roles claim", () => {
      const token = buildToken({ username: "john_doe" });
      expect(getTokenRoles(token)).toEqual([]);
    });

    it("returns empty array when roles claim is not an array", () => {
      const token = buildToken({ roles: "not-an-array" });
      expect(getTokenRoles(token)).toEqual([]);
    });

    it("filters out non-string elements from the roles array", () => {
      const token = buildToken({ roles: ["super_admin", 123, null, "branch_staff"] });
      expect(getTokenRoles(token)).toEqual(["super_admin", "branch_staff"]);
    });

    it("throws on a malformed/garbage token that cannot be parsed", () => {
      // Note: The route.ts implementation does not catch errors internally within getTokenRoles.
      // It splits the token and parses base64, which throws on malformed/garbage tokens.
      // The calling route handler POST wraps it in a try-catch block, so this throwing is the expected behavior.
      expect(() => getTokenRoles("garbage-token-without-dots")).toThrow();
      expect(() => getTokenRoles("header.invalid-base64.signature")).toThrow();
    });
  });

  describe("Combined access gating flow", () => {
    it("denies access for customer-only tokens", () => {
      const token = buildToken({ roles: ["customer"] });
      const roles = getTokenRoles(token);
      expect(hasStaffAccess(roles)).toBe(false);
    });

    it("grants access for branch_staff tokens", () => {
      const token = buildToken({ roles: ["branch_staff"] });
      const roles = getTokenRoles(token);
      expect(hasStaffAccess(roles)).toBe(true);
    });
  });
});
