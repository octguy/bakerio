import { MenuLocationHeader } from "./_components/menu-location-header";

// Shown during navigation while the catalog fetches. It renders the branch
// header (the view-transition morph target) so the tapped location card morphs
// into place immediately, with the menu streaming in behind it.
export default function Loading() {
  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-28">
      <MenuLocationHeader />
      <div className="mb-4 h-[130px] animate-pulse rounded-2xl bg-crust" />
      <div className="animate-pulse space-y-6">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-crust" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-crust" />
          ))}
        </div>
      </div>
    </main>
  );
}
