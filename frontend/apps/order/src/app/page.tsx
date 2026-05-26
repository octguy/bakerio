import { getBranches, type Branch } from "@repo/api-client";
import Link from "next/link";
import { BranchCard } from "./_components/branch-card";

export const dynamic = "force-dynamic";

const HERO_IMAGES: Record<string, string> = {
  north: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1400&q=85&auto=format",
  central: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&q=85&auto=format",
  south: "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1400&q=85&auto=format",
};

export default async function HomePage() {
  let branches: Branch[] = [];
  let error = "";

  try {
    branches = await getBranches();
  } catch {
    error = "We couldn't load branch availability. Please try again.";
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-6 pb-32">
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
        <div className="py-2.5 font-mono text-[11px] tracking-[0.12em] text-caramel">{branches.length} open</div>
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
        {branches.map((branch, i) => (
          <BranchCard key={branch.id} branch={branch} index={i} isSelected={i === 0} heroImage={HERO_IMAGES[branch.region] ?? HERO_IMAGES.south} />
        ))}
      </div>

      {/* Continue CTA */}
      {branches.length > 0 && (
        <div
          className="sticky bottom-16 mt-6 pb-4 pt-4"
          style={{
            background: "linear-gradient(180deg, transparent, var(--cream) 30%)",
          }}
        >
          <div className="text-center font-editorial text-[13px] text-caramel">
            52 items baked fresh at {branches[0]?.name?.split(" ")[0] ?? "Lê Lợi"} this morning.
          </div>
        </div>
      )}
    </main>
  );
}
