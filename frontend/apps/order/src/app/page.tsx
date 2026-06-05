// aria-label: page
import { Suspense } from "react";
import { getBranches, type Branch } from "@repo/api-client";
import { cacheLife } from "next/cache";
import { BranchListClient } from "./_components/branch-list-client";

export const unstable_instant = { prefetch: "static" };

async function getCachedBranches() {
  "use cache";
  cacheLife("hours");
  return getBranches();
}

async function BranchSection({
  searchParams,
}: {
  searchParams?: Promise<{ transitionBranch?: string }>;
}) {
  let branches: Branch[] = [];
  let error = "";
  const transitionBranchId = (await searchParams)?.transitionBranch ?? null;

  try {
    branches = await getCachedBranches();
  } catch {
    error = "We couldn't load branch availability. Please try again.";
  }

  return (
    <BranchListClient initialBranches={branches} error={error} initialTransitionBranchId={transitionBranchId} />
  );
}

export default function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ transitionBranch?: string }>;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-0">
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

      <Suspense fallback={<BranchSectionSkeleton />}>
        <BranchSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function BranchSectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-[52px] flex-1 rounded-2xl border border-crust bg-white/60" />
        <div className="flex gap-2">
          <div className="h-[52px] w-28 rounded-2xl border border-crust bg-white/60" />
          <div className="h-[52px] w-28 rounded-2xl border border-crust bg-white/60" />
        </div>
      </div>
      <div className="mb-3 h-[46px] rounded-2xl border border-crust bg-white/60" />
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl border border-crust bg-white/60" />
        ))}
      </div>
    </div>
  );
}
