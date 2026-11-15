import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

/**
 * Local testing: set NEXT_PUBLIC_USE_EMULATOR=true (see `npm run dev:emulator`)
 * to use the Firebase emulators with a throwaway "demo-" project instead of
 * the live database.
 */
export const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
export const EMULATOR_PROJECT_ID = 'demo-pbstats';

let app: any;
let db: any;
let storage: any;
let auth: any;

try {
  // Initialize Firebase
  const config = USE_EMULATOR
    ? { ...firebaseConfig, projectId: EMULATOR_PROJECT_ID, apiKey: 'demo-api-key', authDomain: 'localhost' }
    : firebaseConfig;
  const fresh = !getApps().length;
  app = fresh ? initializeApp(config) : getApp();
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
  if (USE_EMULATOR && fresh) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);

  // Create mock implementations for development
  db = null;
  storage = null;
  auth = null;
}

export { db, storage, auth };
