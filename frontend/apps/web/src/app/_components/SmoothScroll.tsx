'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SmoothScrollProps {
  children: React.ReactNode;
  lerpFactor?: number;
}

export function SmoothScroll({ children, lerpFactor = 0.04 }: SmoothScrollProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [scrollHeight, setScrollHeight] = useState(0);

  const outerContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);

  const targetScrollY = useRef(0);
  const currentScrollY = useRef(0);
  const requestRef = useRef<number | null>(null);

  // 1. Dynamic touch device detection: enable smooth scrolling on touch-screen laptops
  //    until an actual touch interaction occurs.
  useEffect(() => {
    const handleTouchStart = () => {
      setIsTouchDevice(true);
    };
    window.addEventListener('touchstart', handleTouchStart, { once: true, passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

    // Synchronize initial scroll Y value (e.g. on page refresh/reload)
    targetScrollY.current = window.scrollY;
    currentScrollY.current = window.scrollY;

    // 2. Track native window scroll position
    const handleScroll = () => {
      targetScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 3. Keep scroll height updated using ResizeObserver
    const innerEl = innerContainerRef.current;
    if (!innerEl) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScrollHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(innerEl);

    // Initial height calculation
    setScrollHeight(innerEl.getBoundingClientRect().height);

    // 4. Keyboard focus scroll safety: prevent outer fixed wrapper from scrolling
    const outerEl = outerContainerRef.current;
    const resetOuterScroll = () => {
      if (outerEl) {
        outerEl.scrollTop = 0;
        outerEl.scrollLeft = 0;
      }
    };
    if (outerEl) {
      outerEl.addEventListener('scroll', resetOuterScroll, { passive: true });
    }

    // 5. Linear Interpolation (LERP) animation loop
    const updateScroll = () => {
      // Interpolate current scroll Y position towards target
      currentScrollY.current += (targetScrollY.current - currentScrollY.current) * lerpFactor;

      // Snap to target if the difference is extremely small
      if (Math.abs(targetScrollY.current - currentScrollY.current) < 0.05) {
        currentScrollY.current = targetScrollY.current;
      }

      // Apply transform translation
      if (innerContainerRef.current) {
        innerContainerRef.current.style.transform = `translate3d(0, -${currentScrollY.current.toFixed(2)}px, 0)`;
      }

      requestRef.current = requestAnimationFrame(updateScroll);
    };

    requestRef.current = requestAnimationFrame(updateScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (outerEl) {
        outerEl.removeEventListener('scroll', resetOuterScroll);
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isTouchDevice, lerpFactor]);

  if (isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Viewport outer container (fixed in place) */}
      <div
        ref={outerContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Translating container holding actual page content */}
        <div
          ref={innerContainerRef}
          style={{
            width: '100%',
            willChange: 'transform',
          }}
        >
          {children}
        </div>
      </div>
      {/* Dummy div to provide height/scrollbar matching the inner content */}
      <div
        style={{
          height: `${scrollHeight}px`,
          width: '100%',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
