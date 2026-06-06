import { describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (path: string) => mockRedirect(path) }));

import Page from "./page";

describe("HomePage", () => {
  it("redirects to /menu (menu is the default landing page)", () => {
    Page();
    expect(mockRedirect).toHaveBeenCalledWith("/menu");
  });
});
