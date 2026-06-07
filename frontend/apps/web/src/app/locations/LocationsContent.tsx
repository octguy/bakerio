'use client';

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { getBranches } from "@repo/api-client";
import type { WebLocation } from "@/lib/locations";
import { toWebLocations } from "@/lib/locations";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-butter font-mono text-[11px] text-caramel">
      Loading…
    </div>
  ),
});

// Editorial atlas: SVG abstract HCMC map + tabular shop list.
// Positions are normalised (0..1) — picked to roughly correspond to district.
const PIN_LAYOUT = [
  { x: 0.42, y: 0.55, tagKey: "flagship" },
  { x: 0.5, y: 0.5 },
  { x: 0.46, y: 0.42, tagKey: "coffeeBar" },
  { x: 0.72, y: 0.45 },
  { x: 0.55, y: 0.78, tagKey: "family" },
  { x: 0.35, y: 0.35 },
  { x: 0.32, y: 0.45 },
  { x: 0.28, y: 0.28 },
];

export default function LocationsContent() {
  const t = useTranslations("locations");
  const [locations, setLocations] = useState<WebLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationName, setSelectedLocationName] = useState<string>(locations[0]?.name ?? "");

  useEffect(() => {
    let isMounted = true;

    getBranches()
      .then((branches) => {
        if (!isMounted) return;
        const nextLocations = toWebLocations(branches);
        setLocations(nextLocations);
        setSelectedLocationName(nextLocations[0]?.name ?? "");
      })
      .catch(() => {
        if (!isMounted) return;
        setLocations([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const selectedLocation = locations.find((location) => location.name === selectedLocationName) ?? locations[0] ?? null;
  const selectedIdx = selectedLocation ? locations.findIndex((location) => location.name === selectedLocation.name) : -1;

  if (loading) {
    return (
      <section className="px-6 pb-24 lg:px-14">
        <div className="mx-auto max-w-[1400px] rounded-sm border border-crust bg-white p-10 text-center">
          <p className="font-editorial text-[16px] italic text-caramel">{t("loadingShops")}</p>
        </div>
      </section>
    );
  }

  if (locations.length === 0) {
    return (
      <section className="px-6 pb-24 lg:px-14">
        <div className="mx-auto max-w-[1400px] rounded-sm border border-crust bg-white p-10 text-center">
          <p className="font-editorial text-[16px] italic text-caramel">{t("noShops")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 pb-24 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr]">
          {/* Map */}
          <div className="relative h-[500px] overflow-hidden rounded-sm border border-crust-deep bg-butter lg:h-[630px] z-0">
            <LocationMap
              locations={locations}
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
                    ★ {(() => { const pin = PIN_LAYOUT[locations.findIndex((item) => item.name === selectedLocation.name)]; return pin?.tagKey ? t(pin.tagKey) : "Bakerio shop"; })()}
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
            </div>
            <div className="flex-1 overflow-y-auto">
              {locations.map((s, i) => {
                const isSel = s.name === selectedLocation?.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setSelectedLocationName(s.name)}
                    className={`flex w-full items-center py-3.5 text-left ${
                      i < locations.length - 1 ? "border-b border-crust" : ""
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
                      <div className="mt-0.5 font-editorial text-[13px] text-cinnamon">{s.address}</div>
                    </div>
                    <span className="w-[110px] font-mono text-[11px] text-cocoa">{s.hours.replace(/Mon.Sun /, "")}</span>
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
