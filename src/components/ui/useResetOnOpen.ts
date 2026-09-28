"use client";

/**
 * Clears a modal's local state every time it is opened.
 *
 * Modals in this app render `null` while closed instead of unmounting, so their
 * `useState` values survive a close. Without this the next open still shows the
 * previous entry — a half-filled department, last session's budget lines.
 * Consumed by the admin and request modals that own uncontrolled form state.
 */
import { useEffect, useRef } from "react";

export function useResetOnOpen(isOpen: boolean, reset: () => void) {
  // Held in a ref so callers can pass an inline arrow without the effect
  // re-running on every render and wiping input as the user types. The ref is
  // refreshed in its own effect rather than during render, which React forbids.
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });

  useEffect(() => {
    if (isOpen) resetRef.current();
  }, [isOpen]);
}
