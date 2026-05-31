// aria-label: page
import { getBranches, type Branch } from "@repo/api-client";
import { cacheLife } from "next/cache";
import { BranchListClient } from "./_components/branch-list-client";

export const unstable_instant = { prefetch: "static" };

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

      <BranchListClient initialBranches={branches} error={error} />
    </main>
  );
}
