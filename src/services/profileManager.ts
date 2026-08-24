import { User } from '../types';

export interface SavedProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
  isPremium?: boolean;
  theme?: string;
  lastActive: number;
}

const STORAGE_KEY = 'aether_saved_profiles';
const ACTIVE_PROFILE_KEY = 'aether_active_profile_uid';

/**
 * Retrieves all saved profiles from local storage
 */
export function getSavedProfiles(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: SavedProfile[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)) : [];
  } catch (e) {
    console.warn('Failed to parse saved profiles:', e);
    return [];
  }
}

/**
 * Saves or updates current active profile in the saved profiles register
 */
export function recordProfileSession(user: User): SavedProfile[] {
  try {
    if (!user || !user.uid) return getSavedProfiles();

    const currentProfiles = getSavedProfiles();
    const existingIndex = currentProfiles.findIndex(p => p.uid === user.uid || (user.email && p.email?.toLowerCase() === user.email.toLowerCase()));

    const updatedEntry: SavedProfile = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || user.email?.split('@')[0] || 'Curator',
      photoURL: user.photoURL || null,
      isAdmin: user.isAdmin || false,
      isPremium: user.isPremium || false,
      theme: user.theme || 'orange',
      lastActive: Date.now()
    };

    let updatedList: SavedProfile[];
    if (existingIndex >= 0) {
      updatedList = [...currentProfiles];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...updatedEntry };
    } else {
      updatedList = [updatedEntry, ...currentProfiles];
    }

    // Limit to max 10 saved profiles
    updatedList = updatedList.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    localStorage.setItem(ACTIVE_PROFILE_KEY, user.uid);
    return updatedList;
  } catch (e) {
    console.warn('Failed to record profile session:', e);
    return getSavedProfiles();
  }
}

/**
 * Sets the active profile UID in storage
 */
export function switchActiveProfile(uid: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, uid);
  } catch (e) {
    console.warn('Failed to set active profile UID:', e);
  }
}

/**
 * Removes a profile from the saved profiles list
 */
export function removeSavedProfile(uid: string): SavedProfile[] {
  try {
    const currentProfiles = getSavedProfiles();
    const filtered = currentProfiles.filter(p => p.uid !== uid);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.warn('Failed to remove saved profile:', e);
    return getSavedProfiles();
  }
}
