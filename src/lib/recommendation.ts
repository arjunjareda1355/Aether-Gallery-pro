import { db, COLLECTIONS } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export type ActivityType = 'like' | 'view' | 'comment' | 'share';

export async function trackActivity(userId: string, tags: string[], type: ActivityType) {
  if (!userId || !tags.length) return;

  const interestsRef = doc(db, COLLECTIONS.USER_INTERESTS, userId);
  
  try {
    const snap = await getDoc(interestsRef);
    if (!snap.exists()) {
      const initialInterests: Record<string, any> = {};
      tags.forEach(tag => {
        initialInterests[tag.toLowerCase()] = 1;
      });
      await setDoc(interestsRef, {
        userId,
        interests: initialInterests,
        lastUpdated: new Date()
      });
    } else {
      const updates: Record<string, any> = {
        lastUpdated: new Date()
      };
      
      const weight = type === 'like' ? 3 : type === 'comment' ? 2 : type === 'share' ? 4 : 1;
      
      tags.forEach(tag => {
        const cleanTag = tag.toLowerCase();
        updates[`interests.${cleanTag}`] = increment(weight);
      });
      
      await updateDoc(interestsRef, updates);
    }
  } catch (e) {
    console.error("Tracking failed", e);
  }
}

export async function getUserInterests(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const interestsRef = doc(db, COLLECTIONS.USER_INTERESTS, userId);
    const snap = await getDoc(interestsRef);
    if (snap.exists()) {
      const data = snap.data();
      const interests = data.interests || {};
      // Get top 10 tags
      return Object.entries(interests)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(e => e[0]);
    }
  } catch (e) {
    console.error("Failed to get interests", e);
  }
  return [];
}
