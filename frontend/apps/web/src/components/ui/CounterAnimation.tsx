'use client';
import { useEffect, useRef } from 'react';
import { loadGsap, prefersReducedMotion } from '@/lib/gsap';

interface CounterAnimationProps {
  target: number;
  suffix?: string;
  duration?: number;
}

export default function CounterAnimation({ target, suffix = '', duration = 2 }: CounterAnimationProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) {
      if (ref.current) ref.current.innerText = target.toLocaleString() + suffix;
      return;
    }
    let tween: { kill: () => void } | undefined;
    loadGsap().then(({ gsap }) => {
      const obj = { val: 0 };
      tween = gsap.to(obj, {
        val: target,
        duration,
        ease: 'power2.out',
        snap: { val: 1 },
        scrollTrigger: { trigger: ref.current!, start: 'top 90%', once: true },
        onUpdate: () => {
          if (ref.current) ref.current.innerText = obj.val.toLocaleString() + suffix;
        },
      });
    }).catch(err => console.error('Failed to load GSAP for CounterAnimation:', err));
    return () => { tween?.kill(); };
  }, [target, suffix, duration]);

  return <span ref={ref}>0{suffix}</span>;
}
