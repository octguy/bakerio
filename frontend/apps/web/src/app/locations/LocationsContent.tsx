'use client';

import { useState } from "react";
import { locations, regions } from "@/data/locations";

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
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const filtered = active === "All" ? locations : locations.filter((l) => l.region === active);

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
          <div className="relative h-[500px] overflow-hidden rounded-sm border border-crust-deep bg-butter lg:h-[630px]">
            <svg viewBox="0 0 800 600" className="absolute inset-0 h-full w-full">
              <path
                d="M-20,180 C 100,200 180,280 240,310 C 320,350 360,310 420,350 C 500,400 620,420 720,500 L 820,520 L 820,620 L -20,620 Z"
                fill="var(--crust)"
                opacity="0.55"
              />
              <path
                d="M-20,180 C 100,200 180,280 240,310 C 320,350 360,310 420,350 C 500,400 620,420 720,500 L 820,520"
                stroke="var(--crust-deep)"
                strokeWidth="1.5"
                fill="none"
              />
              <g stroke="var(--crust-deep)" strokeWidth="0.7" fill="none" opacity="0.5">
                <path d="M120,80 L380,60 L420,180 L350,300 L180,260 Z" />
                <path d="M380,60 L580,80 L600,220 L450,260 L420,180 Z" />
                <path d="M580,80 L780,120 L760,260 L600,220 Z" />
                <path d="M180,260 L350,300 L420,350 L380,470 L200,440 Z" />
                <path d="M350,300 L450,260 L600,220 L640,360 L500,420 L420,350 Z" />
                <path d="M380,470 L500,420 L640,360 L660,520 L500,560 L420,540 Z" />
              </g>
              <g fill="var(--crust-deep)" opacity="0.35">
                {Array.from({ length: 14 }).map((_, r) =>
                  Array.from({ length: 18 }).map((_, c) => (
                    <circle key={`${r}-${c}`} cx={50 + c * 42} cy={40 + r * 40} r="0.8" />
                  )),
                )}
              </g>
              <g className="font-mono" fontSize="9" fill="var(--caramel)" letterSpacing="0.18em">
                <text x="230" y="160">D.1</text>
                <text x="450" y="160">D.3</text>
                <text x="650" y="190">D.2</text>
                <text x="500" y="540">D.7</text>
                <text x="650" y="320">THẢO ĐIỀN</text>
              </g>
              <g transform="translate(740,80)">
                <circle r="22" fill="none" stroke="var(--espresso)" strokeWidth="0.7" />
                <polygon points="0,-18 4,0 0,18 -4,0" fill="var(--cinnamon)" />
                <text x="0" y="-26" textAnchor="middle" className="font-mono" fontSize="8" letterSpacing="0.18em">
                  N
                </text>
              </g>
            </svg>

            {locations.map((s, i) => {
              const p = PIN_LAYOUT[i] ?? { x: 0.5, y: 0.5 };
              const num = String(i + 1).padStart(2, "0");
              const isSel = i === selectedIdx;
              return (
                <button
                  key={s.name}
                  onClick={() => setSelectedIdx(i)}
                  className="absolute"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%, -100%)" }}
                  aria-label={s.name}
                >
                  <span
                    className="flex items-center justify-center border-2 border-white shadow-[0_4px_12px_rgba(44,24,16,0.3)]"
                    style={{
                      background: isSel ? "var(--golden)" : "var(--espresso)",
                      color: "#fff",
                      width: isSel ? 36 : 28,
                      height: isSel ? 36 : 28,
                      borderRadius: "50% 50% 50% 0",
                      transform: "rotate(-45deg)",
                    }}
                  >
                    <span
                      className="font-mono font-bold"
                      style={{ transform: "rotate(45deg)", fontSize: isSel ? 12 : 10 }}
                    >
                      {num}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* Callout */}
            <div className="absolute bottom-6 left-6 w-[280px] rounded-sm border border-crust bg-white p-4 shadow-[0_12px_30px_-10px_rgba(44,24,16,0.3)]">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded bg-golden font-mono text-[10px] font-bold text-white">
                  {String(selectedIdx + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-cinnamon">
                  ★ {PIN_LAYOUT[selectedIdx]?.tag ?? "Bakerio shop"}
                </span>
              </div>
              <h4 className="font-display text-[22px] tracking-tight text-espresso">{locations[selectedIdx].name}</h4>
              <div className="mb-2 font-editorial text-[13px] text-cinnamon">{locations[selectedIdx].address}</div>
              <div className="flex gap-3 font-mono text-[11px] text-cocoa">
                <span>● OPEN</span>
                <span>{locations[selectedIdx].hours}</span>
              </div>
            </div>
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
                const globalIdx = locations.indexOf(s);
                const isSel = globalIdx === selectedIdx;
                return (
                  <button
                    key={s.name}
                    onClick={() => setSelectedIdx(globalIdx)}
                    className={`flex w-full items-center py-3.5 text-left ${
                      i < filtered.length - 1 ? "border-b border-crust" : ""
                    } ${isSel ? "-mx-3 rounded bg-vanilla px-3" : ""}`}
                  >
                    <span
                      className="w-7 font-mono text-[11px] font-bold"
                      style={{ color: isSel ? "var(--golden)" : "var(--espresso)" }}
                    >
                      {String(globalIdx + 1).padStart(2, "0")}
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
