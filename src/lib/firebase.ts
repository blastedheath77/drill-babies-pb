import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

let app: any;
let db: any;
let storage: any;
let auth: any;

try {
  // Initialize Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);

  // Create mock implementations for development
  db = null;
  storage = null;
  auth = null;
}

export { db, storage, auth };
