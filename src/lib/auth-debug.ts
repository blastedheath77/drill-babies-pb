import { auth } from './firebase';
import { connectAuthEmulator } from 'firebase/auth';

// Function to test Firebase Auth connectivity
export async function testFirebaseAuth() {
  try {
    console.log('Testing Firebase Auth configuration...');
    console.log('Auth instance:', auth);
    console.log('Auth app:', auth.app);
    console.log('Auth config:', auth.config);
    
    // Check if we're connected to emulator
    if (auth.app.options.projectId === 'demo-project') {
      console.log('Using Firebase Auth Emulator');
    } else {
      console.log('Using Production Firebase Auth');
      console.log('Project ID:', auth.app.options.projectId);
      console.log('Auth Domain:', auth.app.options.authDomain);
    }
    
    return true;
  } catch (error) {
    console.error('Firebase Auth test failed:', error);
    return false;
  }
}

// Call this in development to verify auth setup
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  testFirebaseAuth();
}