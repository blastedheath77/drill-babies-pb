import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function testFirebaseSetup() {
  const results = {
    authInitialized: false,
    firestoreInitialized: false,
    authConfigValid: false,
    firestoreAccessible: false,
    errorDetails: [] as string[]
  };

  try {
    // Test 1: Check if Auth is initialized
    if (auth && auth.app) {
      results.authInitialized = true;
      console.log('✅ Firebase Auth initialized');
      console.log('Project ID:', auth.app.options.projectId);
      console.log('Auth Domain:', auth.app.options.authDomain);
    } else {
      results.errorDetails.push('Firebase Auth not initialized');
    }

    // Test 2: Check if Firestore is initialized  
    if (db && db.app) {
      results.firestoreInitialized = true;
      console.log('✅ Firestore initialized');
    } else {
      results.errorDetails.push('Firestore not initialized');
    }

    // Test 3: Test auth configuration by trying to create a test user
    try {
      // This will fail gracefully if auth is not configured
      const testEmail = `test-${Date.now()}@example.com`;
      const userCred = await createUserWithEmailAndPassword(auth, testEmail, 'testpassword123');
      
      // If successful, delete the test user
      if (userCred.user) {
        await userCred.user.delete();
        results.authConfigValid = true;
        console.log('✅ Firebase Auth configuration valid');
      }
    } catch (authError: any) {
      if (authError.code === 'auth/configuration-not-found') {
        results.errorDetails.push('Firebase Auth not enabled in console');
      } else if (authError.code === 'auth/email-already-in-use') {
        // This actually means auth is working
        results.authConfigValid = true;
        console.log('✅ Firebase Auth configuration valid');
      } else {
        results.errorDetails.push(`Auth test failed: ${authError.code} - ${authError.message}`);
      }
    }

    // Test 4: Test Firestore read access (don't test write without auth)
    try {
      // Test read access to a collection that should be readable
      const testDoc = doc(db, 'players', 'test-read-access');
      await getDoc(testDoc);
      
      results.firestoreAccessible = true;
      console.log('✅ Firestore read access working');
      
      // Note: Write access will be tested after authentication is working
      console.log('ℹ️ Firestore write access will be tested with authenticated user');
    } catch (firestoreError: any) {
      if (firestoreError.code === 'permission-denied') {
        results.errorDetails.push('Firestore rules may be too restrictive. Try the simplified rules provided.');
      } else {
        results.errorDetails.push(`Firestore test failed: ${firestoreError.code} - ${firestoreError.message}`);
      }
    }

  } catch (error: any) {
    results.errorDetails.push(`General error: ${error.message}`);
    console.error('Firebase test error:', error);
  }

  return results;
}

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    testFirebaseSetup().then(results => {
      console.log('🔥 Firebase Setup Test Results:', results);
      
      if (results.errorDetails.length > 0) {
        console.error('❌ Firebase Setup Issues:');
        results.errorDetails.forEach(error => console.error(`  - ${error}`));
        
        console.log('\n🔧 To fix these issues:');
        console.log('1. Go to https://console.firebase.google.com');
        console.log('2. Find your project: pbstats-claude');
        console.log('3. Enable Authentication > Email/Password');
        console.log('4. Create Firestore database in test mode');
        console.log('5. Update security rules as instructed');
      } else {
        console.log('🎉 Firebase is fully configured and working!');
      }
    });
  }, 2000);
}