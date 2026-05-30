import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UndoToast } from './undo-toast';
import { useCartStore } from '@/store/cart';

vi.mock('@/store/cart', () => ({
  useCartStore: vi.fn(),
}));

describe('UndoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runAllTimers(); // finish any Framer Motion exit animations
    });
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders when snapshot exists and times out', () => {
    const dismissUndoMock = vi.fn();
    (useCartStore as any).mockReturnValue({
      undoSnapshot: { items: [{}] },
      restoreCart: vi.fn(),
      dismissUndo: dismissUndoMock,
    });

    render(<UndoToast />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(dismissUndoMock).toHaveBeenCalled();
  });

  it('pauses timer on focus and resumes on blur', () => {
    const dismissUndoMock = vi.fn();
    (useCartStore as any).mockReturnValue({
      undoSnapshot: { items: [{}] },
      restoreCart: vi.fn(),
      dismissUndo: dismissUndoMock,
    });

    // Mock performance.now since vi.useFakeTimers doesn't automatically mock performance.now in vitest
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => time);

    render(<UndoToast />);
    const undoButton = screen.getByRole('button', { name: /undo/i });
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });

    // Advance halfway
    act(() => {
      time += 5000;
      vi.advanceTimersByTime(5000);
    });

    // Trigger focus on Undo button
    act(() => {
      undoButton.focus();
    });

    // Wait past the original timeout
    act(() => {
      time += 6000;
      vi.advanceTimersByTime(6000);
    });

    // Should NOT have dismissed because it was focused
    expect(dismissUndoMock).not.toHaveBeenCalled();

    // Move focus to Dismiss button (simulating tab navigation inside toast)
    act(() => {
      fireEvent.blur(undoButton, { relatedTarget: dismissButton });
      dismissButton.focus();
    });

    // Wait more time to verify timer is still paused since focus stayed inside toast
    act(() => {
      time += 2000;
      vi.advanceTimersByTime(2000);
    });

    expect(dismissUndoMock).not.toHaveBeenCalled();

    // Trigger blur completely outside the toast
    act(() => {
      fireEvent.blur(dismissButton, { relatedTarget: null });
    });

    // Wait the remaining time (5000ms)
    act(() => {
      time += 5000;
      vi.advanceTimersByTime(5000);
    });

    expect(dismissUndoMock).toHaveBeenCalled();
  });
});