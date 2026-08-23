/**
 * Aether Security & Login Notification Dispatcher
 * Sends automated security login alerts with comprehensive session telemetry.
 */

export interface LoginAlertTelemetry {
  email: string;
  displayName?: string | null;
  timestamp?: string;
  userAgent?: string;
  platform?: string;
  timeZone?: string;
  screenResolution?: string;
  language?: string;
}

export async function sendLoginSecurityAlert(email: string, displayName?: string | null): Promise<boolean> {
  if (!email) return false;

  try {
    const telemetry: LoginAlertTelemetry = {
      email,
      displayName: displayName || null,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Agent',
      platform: typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform : 'Unknown Platform',
      timeZone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
      screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en'
    };

    const response = await fetch('/api/send-login-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(telemetry)
    });

    if (response.ok) {
      console.log('🛡️ [Aether Security] Login alert notification transmitted successfully.');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not dispatch login security alert:', err);
    return false;
  }
}
