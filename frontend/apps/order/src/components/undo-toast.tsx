'use client';

import { useEffect, useState, useRef } from 'react';
import { useCartStore } from '@/store/cart';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

export function UndoToast() {
  const { undoSnapshot, restoreCart, dismissUndo } = useCartStore();
  const [timeLeft, setTimeLeft] = useState(10000);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);
  const timeLeftRef = useRef<number>(10000);

  useEffect(() => {
    if (!undoSnapshot) {
      setTimeLeft(10000); // eslint-disable-line react-hooks/set-state-in-effect
      timeLeftRef.current = 10000;
      setIsHovered(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    startRef.current = performance.now();
    
    // Update visual progress
    const visualInterval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 100));
    }, 100);

    timerRef.current = setTimeout(() => {
      clearInterval(visualInterval);
      dismissUndo();
    }, Math.max(0, timeLeftRef.current));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(visualInterval);
      const elapsed = performance.now() - startRef.current;
      timeLeftRef.current = Math.max(0, timeLeftRef.current - elapsed);
      setTimeLeft(timeLeftRef.current);
    };
  }, [undoSnapshot, isHovered, dismissUndo]);

  if (!undoSnapshot) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsHovered(false);
          }
        }}
      >
        <div 
          className="absolute bottom-0 left-0 h-1 bg-white/20"
          style={{ width: `${(timeLeft / 10000) * 100}%`, transition: 'width 100ms linear' }}
        />
        
        <div className="flex flex-col">
          <span className="font-medium text-sm">Cart cleared</span>
          <span className="text-xs text-gray-400">
            {undoSnapshot.items.length} item{undoSnapshot.items.length === 1 ? '' : 's'} removed
          </span>
        </div>

        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
          <button
            onClick={restoreCart}
            className="flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            <RotateCcw className="w-4 h-4" />
            Undo
          </button>
          
          <button
            onClick={dismissUndo}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
