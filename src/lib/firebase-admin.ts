import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

/**
 * Initialize Firebase Admin SDK for server-side operations
 * This bypasses Firestore Security Rules and should only be used in API routes
 */
function initializeAdminApp() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    adminDb = getFirestore(adminApp);
    return;
  }

  try {
    // Method 1: Full service account JSON in one environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    }
    // Method 2: Individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    // For development: Use application default credentials or emulator
    else {
      adminApp = initializeApp();
    }

    adminDb = getFirestore(adminApp);
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

// Initialize on import
initializeAdminApp();

export { adminDb };
