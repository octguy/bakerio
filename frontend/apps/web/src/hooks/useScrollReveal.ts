'use client';
import { useEffect, useRef } from 'react';
import { loadGsap, prefersReducedMotion } from '@/lib/gsap';

export function useScrollReveal<T extends HTMLElement>(options?: { y?: number; delay?: number; stagger?: number }) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const targets = Array.from(el.children.length > 1 ? el.children : [el]) as HTMLElement[];

    if (prefersReducedMotion()) {
      targets.forEach((target) => {
        target.style.opacity = '1';
        target.style.transform = 'none';
      });
      return;
    }

    let cleanup: (() => void) | undefined;
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      gsap.from(targets, {
        opacity: 0, y: options?.y ?? 30, duration: 0.8, delay: options?.delay ?? 0,
        stagger: options?.stagger ?? 0.12, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
      cleanup = () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
    }).catch(err => console.error('Failed to load GSAP for useScrollReveal:', err));
    return () => { cleanup?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
