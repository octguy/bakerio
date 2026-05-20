"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import type { Branch } from "@repo/api-client";

const regionColors: Record<string, string> = {
  north: "bg-blue-100 text-blue-800",
  central: "bg-amber-100 text-amber-800",
  south: "bg-green-100 text-green-800",
};

export function BranchCard({ branch }: { branch: Branch }) {
  const router = useRouter();
  const setBranch = useCartStore((s) => s.setBranch);

  const handleSelect = () => {
    setBranch(branch.id);
    router.push("/menu");
  };

  return (
    <button
      onClick={handleSelect}
      className="bg-white border border-crust rounded-[10px] p-5 text-left hover:shadow-lg hover:border-golden transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-heading font-semibold text-lg">{branch.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${regionColors[branch.region] || "bg-gray-100 text-gray-800"}`}>
          {branch.region}
        </span>
      </div>
      <p className="text-sm text-espresso/60">{branch.address}</p>
    </button>
  );
}
