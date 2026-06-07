"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Location {
  name: string;
  address: string;
  hours: string;
}

interface FeaturedLocationsProps {
  featuredLocations: Location[];
}

const HEROES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=85&auto=format",
  "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1200&q=85&auto=format",
  "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1200&q=85&auto=format",
];

const DOT_WINDOW = 5;
const DOT_PITCH = 16; // px between dot centers (w-2 dot + gap-2)
const DOT_VIEWPORT = 128; // px — clips the strip to ~5 dots
const DOT_INSET = 28; // px — keeps the first windowed dot clear of the left fade
const DOT_MASK = "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)";

export function FeaturedLocations({ featuredLocations }: FeaturedLocationsProps) {
  const t = useTranslations("locations");
  const count = featuredLocations.length;
  // Clones on each side keep the peek neighbors filled during wrap transitions
  const lead = Math.min(2, count);

  const [trackIndex, setTrackIndex] = useState(lead);
  const [transition, setTransition] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Re-enable the transition on the next frame after a clone snap-back
  useEffect(() => {
    if (!transition) {
      const raf = requestAnimationFrame(() => setTransition(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [transition]);

  if (count === 0) {
    return (
      <div className="rounded-sm border border-crust bg-white p-10 text-center">
        <p className="font-editorial text-[16px] italic text-caramel">{t("noShops")}</p>
      </div>
    );
  }

  // Clone the last `lead` and first `lead` cards onto each end so the peek
  // neighbors stay filled while the track wraps around.
  const extendedLocations = [
    ...featuredLocations.slice(count - lead),
    ...featuredLocations,
    ...featuredLocations.slice(0, lead),
  ];

  const realIndex = (((trackIndex - lead) % count) + count) % count;

  const next = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTrackIndex((i) => i + 1);
  };

  const prev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTrackIndex((i) => i - 1);
  };

  // Dots jump straight to the chosen card (stays within real bounds).
  const goTo = (dotIndex: number) => {
    if (isAnimating) return;
    if (dotIndex === realIndex) return;
    setIsAnimating(true);
    setTransition(true);
    setTrackIndex(dotIndex + lead);
  };

  // Snap back instantly when a wrap transition lands on a clone.
  const handleTransitionEnd = () => {
    if (trackIndex >= count + lead) {
      setTransition(false);
      setTrackIndex(trackIndex - count);
    } else if (trackIndex < lead) {
      setTransition(false);
      setTrackIndex(trackIndex + count);
    }
    setIsAnimating(false);
  };

  const handleNext = next;
  const handlePrev = prev;

  const activeDot = realIndex;
  const windowStart = Math.min(
    Math.max(activeDot - 2, 0),
    Math.max(0, count - DOT_WINDOW)
  );
  const windowed = count > DOT_WINDOW;

  const renderDot = (l: Location, i: number) => {
    const isActive = i === activeDot;
    return (
      <button
        key={`${l.name}-dot-${i}`}
        type="button"
        onClick={() => goTo(i)}
        aria-label={`Go to ${l.name} (${i + 1} of ${count})`}
        aria-current={isActive ? "true" : undefined}
        className={`h-2 shrink-0 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golden focus-visible:ring-offset-2 ${
          isActive ? "w-6 bg-golden" : "w-2 bg-crust-deep hover:bg-caramel"
        }`}
      />
    );
  };

  return (
    <div>
      <style>{`
        #featured-locations-track {
          --card-width: 260px;
          --card-gap: 16px;
        }
        @media (min-width: 640px) {
          #featured-locations-track {
            --card-width: 300px;
            --card-gap: 24px;
          }
        }
      `}</style>

      {/* Infinite side carousel viewport */}
      <div
        className="relative h-[360px] sm:h-[400px] overflow-hidden w-full"
        role="group"
        aria-roledescription="carousel"
        aria-label="Featured locations"
      >
        {/* Horizontal track container */}
        <div
          id="featured-locations-track"
          className="absolute left-1/2 top-0 h-full flex items-center"
          style={{
            transform: `translate3d(calc(-1 * (var(--card-width) / 2) - (${trackIndex} * (var(--card-width) + var(--card-gap)))), 0, 0)`,
            transition: transition
              ? "transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1)"
              : "none",
            willChange: "transform",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedLocations.map((l, i) => {
            const isActive = i === trackIndex;
            return (
              <article
                key={`${l.name}-${i}`}
                aria-hidden={!isActive}
                aria-label={l.name}
                className={`w-[260px] sm:w-[300px] shrink-0 overflow-hidden rounded-sm border border-crust bg-white transition-all duration-500 ease-out ${
                  isActive ? "shadow-2xl scale-100 opacity-100" : "shadow-md scale-92 opacity-50"
                }`}
                style={{
                  marginRight: "var(--card-gap)",
                }}
              >
                <div className="relative h-[200px]">
                  <Image
                    src={HEROES[i % HEROES.length]}
                    alt={l.name}
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                  <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-md border border-crust bg-cream font-mono text-[11px] font-bold text-espresso">
                    {String((i % count) + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-[22px] leading-[1.1] tracking-tight text-espresso">{l.name}</h3>
                  <div className="mt-1 font-editorial text-[13px] text-cinnamon">{l.address}</div>
                  <div className="mt-4 flex items-center gap-2.5 font-mono text-[10.5px] tracking-wide text-caramel">
                    <span className="inline-flex items-center gap-1 font-semibold text-sage">
                      <span className="bkr-pulse inline-block h-1.5 w-1.5 rounded-full bg-sage" />
                      Open
                    </span>
                    <span>· {l.hours}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Previous / Next — loop infinitely, so never disabled */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous location"
          className="absolute left-2 sm:left-6 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-espresso/20 bg-cream/90 text-espresso shadow-sm backdrop-blur transition hover:border-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next location"
          className="absolute right-2 sm:right-6 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-espresso/20 bg-cream/90 text-espresso shadow-sm backdrop-blur transition hover:border-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Dot menu — the whole strip slides so the active dot stays centered;
          the fixed viewport clips it to ~5 dots and the soft mask phases the
          edge dots in/out as the window moves. */}
      {windowed ? (
        <div className="mt-6 flex justify-center" role="group" aria-label="Choose a location to view">
          <div
            className="overflow-hidden"
            style={{ width: DOT_VIEWPORT, WebkitMaskImage: DOT_MASK, maskImage: DOT_MASK }}
          >
            <div
              className="flex items-center gap-2 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${DOT_INSET - windowStart * DOT_PITCH}px)` }}
            >
              {featuredLocations.map(renderDot)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2" role="group" aria-label="Choose a location to view">
          {featuredLocations.map(renderDot)}
        </div>
      )}
    </div>
  );
}
