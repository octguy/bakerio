import { getBranches, type Branch } from "@repo/api-client";
import { BranchCard } from "./_components/branch-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let branches: Branch[] = [];
  let error = "";

  try {
    branches = await getBranches();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load branches";
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <section className="text-center mb-10">
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3">Order from Bakerio</h1>
        <p className="text-espresso/70 text-lg">Select a branch to start your order</p>
      </section>

      {error && <p className="text-center text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {branches.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}
      </div>
    </main>
  );
}
