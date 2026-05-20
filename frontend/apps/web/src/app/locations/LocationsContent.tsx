'use client';

import { useState } from "react";
import { MapPin } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import GoogleMap from "@/components/ui/GoogleMap";
import { locations, regions } from "@/data/locations";

export default function LocationsContent() {
  const [active, setActive] = useState<string>("All");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const filtered = active === "All" ? locations : locations.filter((l) => l.region === active);

  const selected = selectedIdx !== null ? locations[selectedIdx] : null;

  return (
    <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto">
      <div className="flex gap-2 justify-center flex-wrap mb-12">
        {regions.map((region) => (
          <button
            key={region}
            onClick={() => setActive(region)}
            className={`px-6 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all ${
              active === region
                ? "bg-golden text-white shadow-md"
                : "bg-white text-cocoa border border-crust hover:border-golden hover:text-golden"
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      <div className="mb-10">
        <GoogleMap
          lat={selected?.lat ?? 10.78}
          lng={selected?.lng ?? 106.71}
          name={selected?.address}
          zoom={selected ? 16 : 12}
          className="h-[400px] w-full"
        />
      </div>

      <ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((l) => {
            const globalIdx = locations.indexOf(l);
            const isSelected = selectedIdx === globalIdx;

            return (
              <div
                key={l.name}
                onClick={() => setSelectedIdx(isSelected ? null : globalIdx)}
                className={`cursor-pointer rounded-[10px] border bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,24,16,0.10)] ${
                  isSelected ? "ring-2 ring-golden border-golden" : "border-crust"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="text-golden shrink-0" size={20} />
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-espresso">{l.name}</h3>
                </div>
                <p className="text-sm text-cocoa mb-1">{l.address}</p>
                <p className="text-sm text-caramel mb-4">{l.hours}</p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block text-sm font-semibold uppercase tracking-wider text-golden hover:text-cinnamon transition-colors"
                >
                  Get Directions →
                </a>
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
