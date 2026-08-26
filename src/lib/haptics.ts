// Safe browser haptic feedback utility
export function hapticSelection(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(8);
    }
  } catch {
    // Ignore environments where vibrate is not supported
  }
}

export function hapticSuccess(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate([12, 40, 15]);
    }
  } catch {
    // Ignore
  }
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 35;
      navigator.vibrate(duration);
    }
  } catch {
    // Ignore
  }
}
