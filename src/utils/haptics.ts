import { useEffect, useRef } from 'react';

/**
 * Aether Haptic & Sensory Feedback Engine
 * Provides subtle, high-fidelity tactile vibration feedback for interactive actions and smooth scrolling.
 */

export type HapticType = 
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'error'
  | 'sparkle'
  | 'pulse'
  | 'scrollTick';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 40,
  selection: 6,
  scrollTick: 4,
  success: [12, 35, 20],
  error: [30, 30, 30, 30, 40],
  sparkle: [6, 25, 10, 25, 18],
  pulse: [15, 50, 20]
};

let lastVibrationTime = 0;

export function triggerHaptic(type: HapticType = 'light'): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      const now = performance.now();
      // Prevent overlapping vibrational spikes
      if (now - lastVibrationTime < 35 && type === 'scrollTick') {
        return;
      }
      lastVibrationTime = now;
      const pattern = HAPTIC_PATTERNS[type] || 8;
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // Graceful fallback on devices/browsers without vibration hardware
  }
}

export const hapticLight = () => triggerHaptic('light');
export const hapticMedium = () => triggerHaptic('medium');
export const hapticHeavy = () => triggerHaptic('heavy');
export const hapticSelection = () => triggerHaptic('selection');
export const hapticScrollTick = () => triggerHaptic('scrollTick');
export const hapticSuccess = () => triggerHaptic('success');
export const hapticError = () => triggerHaptic('error');
export const hapticSparkle = () => triggerHaptic('sparkle');
export const hapticPulse = () => triggerHaptic('pulse');

/**
 * Custom React Hook that attaches silky smooth scroll haptics to the window or scroll containers
 * Emits micro-tactile feedback when scrolling across rows, sections, and scroll limits
 */
export function useScrollHaptics(enabled = true, thresholdPx = 360) {
  const lastScrollYRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const lastTickTimeRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        const delta = Math.abs(currentY - lastScrollYRef.current);
        const now = performance.now();

        accumulatedDeltaRef.current += delta;
        lastScrollYRef.current = currentY;

        // Boundary haptic (top of page or bottom bounce)
        if (currentY <= 2 && now - lastTickTimeRef.current > 400) {
          hapticLight();
          lastTickTimeRef.current = now;
          accumulatedDeltaRef.current = 0;
        } else if (accumulatedDeltaRef.current >= thresholdPx && now - lastTickTimeRef.current > 120) {
          // Micro scroll tactile click
          hapticScrollTick();
          lastTickTimeRef.current = now;
          accumulatedDeltaRef.current = 0;
        }

        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, thresholdPx]);
}
