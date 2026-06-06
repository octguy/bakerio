"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Croissant } from "lucide-react";

export function ProductImageCarousel({ images, productName }: { images: { url: string; alt?: string }[]; productName: string }) {
  const [trackIndex, setTrackIndex] = useState(1);
  const [transition, setTransition] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!transition) requestAnimationFrame(() => setTransition(true));
  }, [transition]);

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Croissant className="text-golden drop-shadow-[0_22px_28px_rgba(180,114,42,0.24)]" size={88} aria-hidden="true" />
      </div>
    );
  }

  if (images.length === 1) {
    return <Image src={images[0].url} alt={images[0].alt || productName} fill className="object-cover" sizes="(min-width: 1024px) 58vw, 100vw" priority />;
  }

  const extended = [images[images.length - 1], ...images, images[0]];
  const realIndex = (trackIndex - 1 + images.length) % images.length;

  const next = () => { if (!isAnimating) { setIsAnimating(true); setTrackIndex((i) => i + 1); } };
  const prev = () => { if (!isAnimating) { setIsAnimating(true); setTrackIndex((i) => i - 1); } };

  const onEnd = () => {
    if (trackIndex === images.length + 1) { setTransition(false); setTrackIndex(1); }
    else if (trackIndex === 0) { setTransition(false); setTrackIndex(images.length); }
    setIsAnimating(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className={`flex h-full ${transition ? "transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0,0,1)]" : ""}`} style={{ transform: `translateX(-${trackIndex * 100}%)` }} onTransitionEnd={onEnd}>
        {extended.map((img, i) => (
          <div key={i} className="relative min-w-full h-full">
            <Image src={img.url} alt={img.alt || productName} fill className="object-cover" sizes="(min-width: 1024px) 58vw, 100vw" priority={i <= 2} />
          </div>
        ))}
      </div>
      <button type="button" onClick={prev} aria-label="Previous image" className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-espresso/60 text-cream shadow-md hover:bg-espresso/80 active:scale-95"><ChevronLeft size={20} /></button>
      <button type="button" onClick={next} aria-label="Next image" className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-espresso/60 text-cream shadow-md hover:bg-espresso/80 active:scale-95"><ChevronRight size={20} /></button>
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {images.map((_, i) => (
          <button key={i} type="button" aria-label={`Image ${i + 1}`} aria-current={i === realIndex ? "true" : undefined} className={`h-2 w-2 rounded-full ${i === realIndex ? "bg-cream" : "bg-cream/40"}`} onClick={() => { setIsAnimating(true); setTrackIndex(i + 1); }} />
        ))}
      </div>
    </div>
  );
}
