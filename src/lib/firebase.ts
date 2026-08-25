import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment, 
  onSnapshot, 
  Timestamp, 
  serverTimestamp, 
  getDocFromServer, 
  initializeFirestore 
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID and optional settings
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');
export const storage = getStorage(app);

// Immersive connection test
export async function testFirestoreConnection() {
  try {
    const testDoc = doc(db, '_connection_test_', 'ping');
    await getDocFromServer(testDoc);
    console.log("Aether Sanctum: Connection resonance established.");
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.warn("Aether Sanctum: Connection established but rules blocks access to _connection_test_.");
      return true;
    }
    console.error("Aether Sanctum: Connection health check failed:", error);
    return false;
  }
}

export const COLLECTIONS = {
  IMAGES: 'images',
  CATEGORIES: 'categories',
  LIKES: 'likes',
  COMMENTS: 'comments',
  REPORTS: 'reports',
  COLLECTIONS: 'user_collections',
  APP_SETTINGS: 'app_settings',
  USERS: 'users',
  PAYMENTS: 'payments',
  UPGRADE_REQUESTS: 'upgrade_requests',
  USER_INTERESTS: 'user_interests',
  FOLLOWS: 'follows'
};

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
}

export const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions') || error.message?.includes('Missing or insufficient permissions')) {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message || 'Permission Denied',
      operationType,
      path
    };
    console.error("CRITICAL: Permission Error Detected:", JSON.stringify(errorInfo, null, 2));
    throw new Error(JSON.stringify(errorInfo));
  }
  console.error("Firestore operation error:", error);
  throw error;
};
