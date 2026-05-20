'use client';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function ScrollReveal({ children, className, ...opts }: { children: React.ReactNode; className?: string; y?: number; delay?: number; stagger?: number }) {
  const ref = useScrollReveal<HTMLDivElement>(opts);
  return <div ref={ref} className={className}>{children}</div>;
}

export default ScrollReveal;
