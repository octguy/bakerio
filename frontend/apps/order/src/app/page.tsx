// aria-label: page
import { getBranches, type Branch } from "@repo/api-client";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { BranchCard } from "./_components/branch-card";

export const unstable_instant = { prefetch: "static" };

const HERO_IMAGES: Record<string, string> = {
  north: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1400&q=85&auto=format",
  central: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&q=85&auto=format",
  south: "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1400&q=85&auto=format",
};

const DEFAULT_CUSTOMER_LOCATION = { lat: 10.7769, lng: 106.7009 };
const FALLBACK_DISTANCE_KM = Number.POSITIVE_INFINITY;

function distanceKm(branch: Branch) {
  if (typeof branch.lat !== "number" || typeof branch.lng !== "number") {
    return FALLBACK_DISTANCE_KM;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(branch.lat - DEFAULT_CUSTOMER_LOCATION.lat);
  const dLng = toRad(branch.lng - DEFAULT_CUSTOMER_LOCATION.lng);
  const lat1 = toRad(DEFAULT_CUSTOMER_LOCATION.lat);
  const lat2 = toRad(branch.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function distanceLabel(distance: number) {
  return Number.isFinite(distance) ? `${distance.toFixed(distance < 10 ? 1 : 0)} km` : "Nearby";
}

function etaLabel(distance: number) {
  if (!Number.isFinite(distance)) return "15–25 min";
  if (distance < 2) return "15–25 min";
  if (distance < 5) return "25–35 min";
  if (distance < 8) return "35–50 min";
  return "45–60 min";
}

async function getCachedBranches() {
  "use cache";
  cacheLife("hours");
  return getBranches();
}

export default async function HomePage() {
  let branches: Branch[] = [];
  let error = "";

  try {
    branches = await getCachedBranches();
  } catch {
    error = "We couldn't load branch availability. Please try again.";
  }

  const rankedBranches = branches
    .map((branch) => ({ branch, distance: distanceKm(branch) }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <main id="main-content" className="mx-auto max-w-md px-6 pt-6 pb-0">
      {/* Greeting */}
      <section className="pb-6 pt-4">
        <span className="block font-script text-[28px] leading-none text-cinnamon">good morning,</span>
        <h1
          className="mt-2 font-display tracking-tight text-espresso"
          style={{
            fontSize: "clamp(36px,9vw,44px)",
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
          }}
        >
          Where shall
          <br />
          we bake <span className="font-editorial text-cinnamon">for you?</span>
        </h1>
      </section>

      {/* Use my location */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-crust bg-white px-4 py-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-butter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cinnamon)" strokeWidth="2">
            <circle cx="12" cy="10" r="3" />
            <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-espresso">Use my location</div>
          <div className="mt-0.5 font-editorial text-[11.5px] text-caramel">We&apos;ll find your nearest oven.</div>
        </div>
        <span className="text-[18px] text-caramel">›</span>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-6 border-b border-crust">
        {["Pickup", "Delivery", "Dine in"].map((label, i) => (
          <div
            key={label}
            className={`-mb-px border-b-2 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] ${
              i === 0 ? "border-espresso font-bold text-espresso" : "border-transparent text-caramel"
            }`}
          >
            {label}
          </div>
        ))}
        <div className="flex-1" />
        <div className="py-2.5 font-mono text-[11px] tracking-[0.12em] text-caramel">{rankedBranches.length} open</div>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-xl border border-sienna/30 bg-sienna/10 px-4 py-3 text-center">
          <p className="font-mono text-[11px] tracking-wider text-sienna">{error}</p>
          <Link
            href="/"
            className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cinnamon"
          >
            Retry
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
         {rankedBranches.map(({ branch, distance }, i) => (
           <BranchCard
             key={branch.id}
             branch={branch}
             isSelected={i === 0}
             heroImage={HERO_IMAGES.south}
             distanceLabel={distanceLabel(distance)}
             etaLabel={etaLabel(distance)}
           />
         ))}
      </div>

      {/* Continue CTA */}
      {rankedBranches.length > 0 && (
        <div
          className="sticky bottom-16 md:bottom-0 z-40 -mx-6 px-6 pb-4 pt-6 backdrop-blur-[6px]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(253, 248, 243, 0.75) 30%, var(--cream) 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
          }}
        >
          <div className="text-center font-editorial text-[13px] text-caramel">
            52 items baked fresh at {rankedBranches[0]?.branch.name?.split(" ")[0] ?? "Lê Lợi"} this morning.
          </div>
        </div>
      )}
    </main>
  );
}
