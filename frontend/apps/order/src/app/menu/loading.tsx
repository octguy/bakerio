import { MenuLayoutClient } from "./_components/menu-layout-client";

// Shown during navigation while the catalog fetches. It renders the branch
// header (the view-transition morph target) so the tapped location card morphs
// into place immediately, with the menu streaming in behind it.
export default function Loading() {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip px-4 pt-3 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-16 xl:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_12%,rgba(232,169,78,0.22),transparent_24%),linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_52%,#f4dfbd_100%)]" />
      <MenuLayoutClient
        catalogSection={
          <div className="space-y-6 lg:pt-2">
            <div className="rounded-[1.75rem] border border-crust bg-cream/70 p-4 md:rounded-[2.25rem] md:p-5">
              <div className="mb-4 h-14 animate-pulse rounded-2xl bg-crust" />
              <div className="h-12 animate-pulse rounded-full bg-crust" />
              <div className="mt-4 flex gap-2 overflow-hidden md:flex-wrap">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-crust" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] 2xl:grid-cols-[repeat(auto-fit,minmax(min(100%,14.5rem),1fr))]">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-[1.65rem] bg-crust md:rounded-[2rem]" />
              ))}
            </div>
          </div>
        }
      />
    </main>
  );
}
