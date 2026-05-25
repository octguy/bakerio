import { getToken, loginAsGuest } from "@repo/api-client";

let guestLoginPromise: Promise<void> | null = null;

export async function ensureGuestSession(): Promise<void> {
  if (getToken()) {
    return;
  }

  if (!guestLoginPromise) {
    guestLoginPromise = loginAsGuest().catch(() => {
      // Let downstream loaders use their existing error/fallback paths.
    }).finally(() => {
      guestLoginPromise = null;
    });
  }

  await guestLoginPromise;
}
