'use client';

import { useMemo, useState } from "react";
import { locations, regions } from "@/data/locations";
import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-butter font-mono text-[11px] text-caramel">
      Loading Atlas...
    </div>
  ),
});

// Editorial atlas: SVG abstract HCMC map + tabular shop list.
// Positions are normalised (0..1) — picked to roughly correspond to district.
const PIN_LAYOUT = [
  { x: 0.42, y: 0.55, tag: "Flagship" },
  { x: 0.5, y: 0.5 },
  { x: 0.46, y: 0.42, tag: "Coffee bar" },
  { x: 0.72, y: 0.45 },
  { x: 0.55, y: 0.78, tag: "Family" },
  { x: 0.35, y: 0.35 },
  { x: 0.32, y: 0.45 },
  { x: 0.28, y: 0.28 },
];

export default function LocationsContent() {
  const [active, setActive] = useState<string>("All");
  const [prevActive, setPrevActive] = useState<string>("All");
  const [selectedLocationName, setSelectedLocationName] = useState<string>(locations[0]?.name ?? "");
  const filtered = useMemo(
    () => (active === "All" ? locations : locations.filter((l) => l.region === active)),
    [active],
  );

  if (active !== prevActive) {
    setPrevActive(active);
    setSelectedLocationName(filtered[0]?.name ?? "");
  }

  const selectedLocation = filtered.find((location) => location.name === selectedLocationName) ?? filtered[0] ?? null;
  const selectedIdx = selectedLocation ? filtered.findIndex((location) => location.name === selectedLocation.name) : -1;

  return (
    <section className="px-6 pb-24 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        {/* Region tabs */}
        <div className="mb-6 flex flex-wrap gap-1.5">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setActive(region)}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-[0.1em] transition-all ${
                active === region
                  ? "bg-espresso font-bold text-cream"
                  : "border border-crust bg-white text-cocoa hover:border-espresso"
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr]">
          {/* Map */}
          <div className="relative h-[500px] overflow-hidden rounded-sm border border-crust-deep bg-butter lg:h-[630px] z-0">
            <LocationMap
              locations={filtered}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocationName}
            />

            {/* Callout */}
            {selectedLocation && (
              <div className="absolute bottom-6 left-6 w-[280px] rounded-sm border border-crust bg-white p-4 shadow-[0_12px_30px_-10px_rgba(44,24,16,0.3)] z-20">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded bg-golden font-mono text-[10px] font-bold text-white">
                    {String(selectedIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-cinnamon">
                    ★ {PIN_LAYOUT[locations.findIndex((item) => item.name === selectedLocation.name)]?.tag ?? "Bakerio shop"}
                  </span>
                </div>
                <h4 className="font-display text-[22px] tracking-tight text-espresso">{selectedLocation.name}</h4>
                <div className="mb-2 font-editorial text-[13px] text-cinnamon">{selectedLocation.address}</div>
                <div className="flex gap-3 font-mono text-[11px] text-cocoa">
                  <span>● OPEN</span>
                  <span>{selectedLocation.hours}</span>
                </div>
              </div>
            )}
          </div>

          {/* Shop list */}
          <div className="flex flex-col">
            <div className="mb-3 flex justify-between border-b border-crust pb-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-caramel">
              <span>№</span>
              <span className="flex-1 pl-4">SHOP</span>
              <span className="w-[110px]">HOURS</span>
              <span className="w-[60px] text-right">REGION</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((s, i) => {
                const isSel = s.name === selectedLocation?.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setSelectedLocationName(s.name)}
                    className={`flex w-full items-center py-3.5 text-left ${
                      i < filtered.length - 1 ? "border-b border-crust" : ""
                    } ${isSel ? "-mx-3 rounded bg-vanilla px-3" : ""}`}
                  >
                    <span
                      className="w-7 font-mono text-[11px] font-bold"
                      style={{ color: isSel ? "var(--golden)" : "var(--espresso)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 pl-4">
                      <div className="font-display text-[18px] leading-tight tracking-tight text-espresso">
                        {s.name}
                      </div>
                      <div className="mt-0.5 font-editorial text-[13px] text-cinnamon">{s.region}</div>
                    </div>
                    <span className="w-[110px] font-mono text-[11px] text-cocoa">{s.hours.replace(/Mon.Sun /, "")}</span>
                    <span className="w-[60px] text-right font-mono text-[11px] text-caramel">{s.region.split(" ").pop()}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between border-t border-crust pt-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-caramel">
              <span>Three more opening · Đà Nẵng · Hà Nội · 2026</span>
              <span className="text-espresso">Use my location ↗</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
