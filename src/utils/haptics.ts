/**
 * Aether Haptic & Sensory Feedback Engine
 * Provides subtle, high-fidelity tactile vibration feedback for interactive actions.
 */

export type HapticType = 
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'error'
  | 'sparkle'
  | 'pulse';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 12,
  medium: 28,
  heavy: 45,
  selection: 8,
  success: [15, 45, 30],
  error: [40, 40, 40, 40, 50],
  sparkle: [8, 30, 12, 30, 22],
  pulse: [20, 70, 25]
};

export function triggerHaptic(type: HapticType = 'light'): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      const pattern = HAPTIC_PATTERNS[type] || 12;
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // Graceful fallback on devices/browsers that disallow or don't support vibration
  }
}

export const hapticLight = () => triggerHaptic('light');
export const hapticMedium = () => triggerHaptic('medium');
export const hapticHeavy = () => triggerHaptic('heavy');
export const hapticSelection = () => triggerHaptic('selection');
export const hapticSuccess = () => triggerHaptic('success');
export const hapticError = () => triggerHaptic('error');
export const hapticSparkle = () => triggerHaptic('sparkle');
export const hapticPulse = () => triggerHaptic('pulse');
