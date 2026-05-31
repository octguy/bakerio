"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  description: string;
}

const slides: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=85&auto=format",
    title: "48-hour",
    subtitle: "sourdough.",
    description: "110K₫ · crackly at 11:00",
  },
  {
    image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1400&q=85&auto=format",
    title: "Fresh pastry",
    subtitle: "croissant.",
    description: "85K₫ · buttery melt",
  },
  {
    image: "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1400&q=85&auto=format",
    title: "Warm coffee",
    subtitle: "brew.",
    description: "65K₫ · espresso",
  },
];

export function ProductBanner() {
  const [trackIndex, setTrackIndex] = useState(1); // start at first real slide (index 1 in extended array)
  const extendedSlides = [{...slides[slides.length - 1]}, ...slides, { ...slides[0] }];
  const realIndex = (trackIndex - 1 + slides.length) % slides.length;


  const [transition, setTransition] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Handle wrap-around resets without visible animation
  const handleTransitionEnd = () => {
    if (trackIndex === slides.length + 1) {
      // moved onto clone of first slide, reset to real first slide
      setTransition(false);
      setTrackIndex(1);
    } else if (trackIndex === 0) {
      // moved onto clone of last slide, reset to real last slide
      setTransition(false);
      setTrackIndex(slides.length);
    }
    // Transition completed, allow next navigation
    setIsAnimating(false);
  };

  // Re‑enable transition after index reset
  useEffect(() => {
    if (!transition) {
      // next tick to allow DOM update without transition
      requestAnimationFrame(() => setTransition(true));
    }
  }, [transition]);

  return (
    <div className="group relative h-full min-h-[200px] overflow-hidden rounded-[2rem] border border-espresso/10 bg-espresso text-cream shadow-[0_30px_70px_-45px rgba(44,24,16,0.85)] transition-all duration-[600ms] ease-[cubic-bezier(0.2,0,0,1)] lg:rounded-[2.75rem]">
    {/* Track for infinite carousel */}
<div
          className={`flex h-full min-h-full relative ${transition ? "transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0,0,1)]" : ""}`}
          style={{ transform: `translateX(-${trackIndex * 100}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
      {extendedSlides.map((slide, i) => (
        <div key={i} className="min-w-full relative h-full min-h-full flex-1">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(44,24,16,0.1), rgba(44,24,16,0.88)), url(${slide.image})`,
            }}
          />
          {/* Text content */}
          <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-7 lg:bottom-8">
            <h1 className="max-w-[11ch] font-display text-[clamp(3rem,16vw,6.6rem)] leading-[0.76] tracking-[-0.08em] text-cream drop-shadow-[0_16px_30px_rgba(0,0,0,0.28)] lg:text-[clamp(3.4rem,5.5vw,6.4rem)] min-[1440px]:text-[clamp(3.75rem,4.8vw,5.9rem)] 2xl:text-[clamp(4.25rem,6vw,7.5rem)]">
              {slide.title}
              <span className="block translate-x-5 font-editorial italic text-honey sm:translate-x-10">{slide.subtitle}</span>
            </h1>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="rounded-full bg-cream px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-espresso">
                {slide.description}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Header badges (outside track so they never disappear during clone-slide transitions) */}
    <div className="pointer-events-none absolute inset-x-5 top-5 flex items-center justify-between gap-3 sm:inset-x-7 sm:top-7">
      <div className="rounded-full border border-cream/30 bg-cream/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-espresso shadow-lg">
        ★ today&apos;s batch
      </div>
      <div className="hidden -rotate-6 rounded-full bg-honey px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-espresso shadow-[0_12px_24px_rgba(0,0,0,0.25)] sm:block">
        {Math.max(0, slides.length - realIndex - 1)} left
      </div>
    </div>

    {/* Navigation chevrons */}
    <button
      type="button"
      onClick={prev}
      aria-label="Previous slide"
      className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-espresso/60 text-cream shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-espresso/80 active:scale-95 can-hover:opacity-0 can-hover:group-hover:opacity-100 focus-visible:opacity-100"
    >
      <ChevronLeft size={24} />
    </button>
    <button
      type="button"
      onClick={next}
      aria-label="Next slide"
      className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-espresso/60 text-cream shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-espresso/80 active:scale-95 can-hover:opacity-0 can-hover:group-hover:opacity-100 focus-visible:opacity-100"
    >
      <ChevronRight size={24} />
    </button>

    {/* Dots indicator */}
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
      {slides.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Slide ${i + 1}`}
          aria-current={i === realIndex ? "true" : undefined}
          className={`h-2 w-2 rounded-full ${i === realIndex ? "bg-cream" : "bg-cream/40"}`}
          onClick={() => { if (isAnimating) { setIsAnimating(false); } setIsAnimating(true); setTrackIndex(i + 1); }}
        />
      ))}
    </div>
  </div>
  );
}
