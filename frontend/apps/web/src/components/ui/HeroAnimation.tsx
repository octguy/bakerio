'use client';
import { useEffect, useRef } from 'react';
import { loadGsap, prefersReducedMotion } from '@/lib/gsap';

export default function HeroAnimation({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    loadGsap().then(({ gsap }) => {
      gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } })
        .from(ref.current!.children, { opacity: 0, y: 30, stagger: 0.15 });
    });
  }, []);

  return <div ref={ref}>{children}</div>;
}
