"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/store/cart';

export function CartSync() {
  const { user } = useAuth();
  const setAuthed = useCartStore((s) => s.setAuthed);
  const mergeAndHydrate = useCartStore((s) => s.mergeAndHydrate);
  const resetForSignedOut = useCartStore((s) => s.resetForSignedOut);
  const prevUserRef = useRef(user);

  useEffect(() => {
    setAuthed(Boolean(user));
  }, [user, setAuthed]);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;
    if (prevUser && !user) {
      resetForSignedOut();
      return;
    }
    if (user) mergeAndHydrate();
  }, [user, mergeAndHydrate, resetForSignedOut]);

  return null;
}
