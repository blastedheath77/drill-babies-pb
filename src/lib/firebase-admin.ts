import admin from 'firebase-admin';

/**
 * Credentials, in order of preference:
 *  1. FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY
 *     (what production has always used, e.g. for password reset)
 *  2. FIREBASE_SERVICE_ACCOUNT: the whole service-account JSON (used locally)
 * Initialised lazily so builds don't need credentials.
 */
function getCredential(): admin.credential.Credential {
  const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY } = process.env;
  if (FIREBASE_ADMIN_PROJECT_ID && FIREBASE_ADMIN_CLIENT_EMAIL && FIREBASE_ADMIN_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    let parsed: { project_id?: string; client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(json.trim().replace(/^'|'$/g, ''));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }
    return admin.credential.cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
    });
  }

  throw new Error('Firebase Admin credentials are missing (set FIREBASE_ADMIN_* or FIREBASE_SERVICE_ACCOUNT)');
}

function getAdminApp() {
  if (admin.apps.length) return admin.apps[0]!;
  // With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST set, the Admin
  // SDK talks to the local emulators and needs no credentials.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-pbstats' });
  }
  return admin.initializeApp({ credential: getCredential() });
}

export const adminAuth = () => getAdminApp().auth();
export const adminDb = () => getAdminApp().firestore();
export { admin };
