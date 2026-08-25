import { db, COLLECTIONS } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface VerificationLinkResult {
  success: boolean;
  message: string;
  verificationLink?: string;
  token?: string;
  error?: string;
}

/**
 * Dispatch verification link to the given email address.
 */
export async function dispatchVerificationLink(
  email: string,
  displayName?: string | null
): Promise<VerificationLinkResult> {
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Valid email address is required', error: 'Invalid email' };
  }

  const cleanEmail = email.trim().toLowerCase();
  let linkResult: VerificationLinkResult = {
    success: true,
    message: `Verification link sent to ${cleanEmail}`
  };

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch('/api/send-verification-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        displayName: displayName || null,
        origin
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      linkResult = {
        success: true,
        message: data.message || `Verification link sent to ${cleanEmail}`,
        verificationLink: data.verificationLink,
        token: data.token
      };
    } else {
      console.warn('Backend verification link dispatch note:', data.error);
    }
  } catch (err: any) {
    console.warn('Backend link dispatch network note:', err?.message || err);
  }

  return linkResult;
}

/**
 * Verify a link token received in the URL
 */
export async function verifyLinkToken(
  token: string,
  email?: string
): Promise<{ success: boolean; verified: boolean; email?: string; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/verify-link-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });

    const data = await res.json();
    if (res.ok && data.verified) {
      return {
        success: true,
        verified: true,
        email: data.email,
        message: data.message || 'Email successfully verified'
      };
    }
    return {
      success: false,
      verified: false,
      error: data.error || 'Verification link is invalid or expired'
    };
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      error: err?.message || 'Network error verifying link token'
    };
  }
}

/**
 * Check if the email or token has been verified
 */
export async function checkEmailVerifiedStatus(
  email?: string,
  token?: string
): Promise<boolean> {
  if (email || token) {
    try {
      const res = await fetch('/api/check-verification-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });
      const data = await res.json();
      if (data.verified) {
        return true;
      }
    } catch (e) {
      console.warn('Backend verification status check note:', e);
    }
  }

  return false;
}

/**
 * Update user document in Firestore to emailVerified: true
 */
export async function recordEmailVerifiedInFirestore(uid: string) {
  if (!uid) return;
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      emailVerified: true,
      emailVerifiedAt: serverTimestamp()
    });
    console.log(`✅ [Firestore] User ${uid} marked emailVerified: true`);
  } catch (err) {
    console.warn('Could not update emailVerified in Firestore:', err);
  }
}

/**
 * Fallback handler for verification action code
 */
export async function handleFirebaseActionCode(oobCode: string): Promise<boolean> {
  return Boolean(oobCode);
}
