import admin from 'firebase-admin';

/**
 * Credentials come from either:
 *  - FIREBASE_SERVICE_ACCOUNT: the whole service-account JSON (used locally), or
 *  - FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY.
 * Initialised lazily so builds don't need credentials.
 */
function getCredential(): admin.credential.Credential {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    const parsed = JSON.parse(json.trim().replace(/^'|'$/g, ''));
    return admin.credential.cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
    });
  }

  return admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });
}

function getAdminApp() {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp({ credential: getCredential() });
}

export const adminAuth = () => getAdminApp().auth();
export const adminDb = () => getAdminApp().firestore();
export { admin };
