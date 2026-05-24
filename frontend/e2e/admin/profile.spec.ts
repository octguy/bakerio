import { test, expect } from "@playwright/test";

// Profile page does not exist yet — skip these tests
test.describe("Admin — Profile Management", () => {
  test.skip("view own profile shows user name", async () => {
    // TODO: implement when /profile page is added
  });

  test.skip("update own profile", async () => {
    // TODO: implement when /profile page is added
  });

  test.skip("profile shows current user info from auth context", async () => {
    // TODO: implement when /profile page is added
  });
});
