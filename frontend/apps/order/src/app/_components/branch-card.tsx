"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import type { Branch } from "@repo/api-client";

interface Props {
  branch: Branch;
  index: number;
  isSelected: boolean;
  heroImage: string;
}

const regionTags: Record<string, string> = {
  north: "Flagship",
  central: "Family",
  south: "Coffee bar",
};

export function BranchCard({ branch, index, isSelected, heroImage }: Props) {
  const router = useRouter();
  const setBranch = useCartStore((s) => s.setBranch);

  const handleSelect = () => {
    setBranch(branch.id);
    router.push("/menu");
  };

  const tag = regionTags[branch.region];
  const dist = ["0.8 km", "2.1 km", "5.6 km", "7.2 km"][index % 4];
  const eta = ["15–25 min", "25–35 min", "35–50 min", "45–60 min"][index % 4];

  return (
    <button
      onClick={handleSelect}
      className={`relative flex overflow-hidden rounded-2xl text-left transition-colors ${
        isSelected ? "border-2 border-espresso bg-white" : "border border-crust bg-white"
      }`}
    >
      <div className="relative h-[100px] w-[100px] flex-shrink-0">
        <Image src={heroImage} alt={branch.name} fill className="object-cover" sizes="100px" />
        {tag && (
          <span className="absolute left-2 top-2 rounded-full bg-cream px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-cinnamon">
            ★ {tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between px-3.5 py-3">
        <div>
          <h3 className="font-display text-[18px] leading-[1.05] tracking-tight text-espresso">
            {branch.name}
          </h3>
          <div className="mt-0.5 font-editorial text-[12px] text-cinnamon">{branch.address}</div>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-sage">
            <span className="bkr-pulse inline-block h-1.5 w-1.5 rounded-full bg-sage" /> Open
          </span>
          <span className="font-mono text-[10px] text-cocoa">{dist}</span>
          <span className="font-mono text-[10px] text-caramel">· {eta}</span>
        </div>
      </div>
      {isSelected && (
        <span className="absolute right-0 top-0 rounded-bl-[12px] bg-espresso px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-cream">
          ✓ Selected
        </span>
      )}
    </button>
  );
}
