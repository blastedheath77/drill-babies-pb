import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserDocument, UserRole } from './auth-types';
import { logger } from './logger';

const USERS_COLLECTION = 'users';

/**
 * Creates a new user document in Firestore
 */
export async function createUserDocument(
  firebaseUser: FirebaseUser,
  additionalData: { name: string; role?: UserRole }
): Promise<User> {
  try {
    console.log('💾 Creating user document in Firestore for:', firebaseUser.uid);
    
    const userDoc = doc(db, USERS_COLLECTION, firebaseUser.uid);
    const userData: UserDocument = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      name: additionalData.name,
      role: additionalData.role || 'player',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      ...(firebaseUser.photoURL && { avatar: firebaseUser.photoURL }), // Only include avatar if it exists
    };

    console.log('📝 Writing user document to Firestore...', userData);
    await setDoc(userDoc, userData);
    console.log('✅ User document written successfully');
    
    logger.info('User document created', { uid: firebaseUser.uid, email: firebaseUser.email });

    const user = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      name: additionalData.name,
      role: additionalData.role || 'player',
      createdAt: new Date().toISOString(),
      ...(firebaseUser.photoURL && { avatar: firebaseUser.photoURL }), // Only include avatar if it exists
    };
    
    console.log('🎯 Returning user object:', user);
    return user;
  } catch (error: any) {
    console.error('❌ Error creating user document:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

/**
 * Gets user document from Firestore
 */
export async function getUserDocument(uid: string): Promise<User | null> {
  // If Firebase db is not available, return null
  if (!db) {
    console.warn('⚠️ Firebase db not available, cannot fetch user document');
    return null;
  }

  try {
    const userDoc = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as UserDocument;
    return {
      id: userData.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      avatar: userData.avatar,
      createdAt: userData.createdAt.toDate().toISOString(),
      updatedAt: userData.updatedAt?.toDate().toISOString(),
    };
  } catch (error) {
    logger.error('Error fetching user document', error);
    return null;
  }
}

/**
 * Updates user document in Firestore
 */
export async function updateUserDocument(
  uid: string,
  updates: Partial<Pick<UserDocument, 'name' | 'avatar' | 'role'>>
): Promise<boolean> {
  try {
    const userDoc = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDoc, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    logger.info('User document updated', { uid, updates });
    return true;
  } catch (error) {
    logger.error('Error updating user document', error);
    return false;
  }
}

/**
 * Register a new user with email and password
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'player'
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('🔥 Starting user registration with Firebase Auth');
    console.log('📧 Email:', email);
    console.log('👤 Name:', name);
    console.log('🔐 Password length:', password.length);
    
    logger.info('Starting user registration', { email, name, role });
    
    console.log('🚀 Calling createUserWithEmailAndPassword...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('✅ Firebase user created:', firebaseUser.uid);
    logger.info('Firebase user created successfully', { uid: firebaseUser.uid });

    // Update the user's display name in Firebase Auth
    console.log('📝 Updating user profile...');
    await updateProfile(firebaseUser, { displayName: name });
    console.log('✅ User profile updated');
    logger.info('User profile updated', { uid: firebaseUser.uid, displayName: name });

    // Send email verification
    console.log('📧 Sending email verification...');
    await sendEmailVerification(firebaseUser);
    console.log('✅ Email verification sent');
    logger.info('Email verification sent', { uid: firebaseUser.uid, email: firebaseUser.email });

    // Create user document in Firestore
    console.log('💾 Creating user document in Firestore...');
    const user = await createUserDocument(firebaseUser, { name, role });
    console.log('✅ User document created successfully');
    logger.info('User document created successfully', { uid: firebaseUser.uid });

    return { success: true, user };
  } catch (error: any) {
    console.error('❌ Registration error occurred:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    logger.error('Registration error', { 
      errorCode: error.code, 
      errorMessage: error.message, 
      email 
    });
    
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code || 'unknown') 
    };
  }
}

/**
 * Sign in user with email and password
 */
export async function signInUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('🔥 Starting user sign-in with Firebase Auth');
    console.log('📧 Email:', email);
    console.log('🔐 Password length:', password.length);
    
    console.log('🚀 Calling signInWithEmailAndPassword...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('✅ Firebase sign-in successful:', firebaseUser.uid);

    // Check if email is verified
    if (!firebaseUser.emailVerified) {
      console.warn('⚠️ Email not verified');
      return { 
        success: false, 
        error: 'Please verify your email address before signing in. Check your inbox for a verification email.' 
      };
    }

    // Get user document from Firestore
    console.log('📄 Getting user document from Firestore...');
    let user = await getUserDocument(firebaseUser.uid);
    
    if (!user) {
      console.warn('⚠️ User document not found, creating it now...');
      // Create user document if it doesn't exist (handles incomplete registrations)
      user = await createUserDocument(firebaseUser, { 
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        role: 'player'
      });
      console.log('✅ User document created during sign-in');
    }
    console.log('✅ User document retrieved successfully');

    return { success: true, user };
  } catch (error: any) {
    console.error('❌ Sign-in error occurred:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    logger.error('Sign in error', error);
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code) 
    };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<boolean> {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    logger.error('Sign out error', error);
    return false;
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION));
    const querySnapshot = await getDocs(usersQuery);
    
    return querySnapshot.docs.map(doc => {
      const userData = doc.data() as UserDocument;
      return {
        id: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
        createdAt: userData.createdAt.toDate().toISOString(),
        updatedAt: userData.updatedAt?.toDate().toISOString(),
      };
    });
  } catch (error) {
    logger.error('Error fetching all users', error);
    return [];
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(uid: string): Promise<boolean> {
  try {
    const userDoc = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userDoc);
    logger.info('User document deleted', { uid });
    return true;
  } catch (error) {
    logger.error('Error deleting user', error);
    return false;
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<boolean> {
  return updateUserDocument(uid, { role });
}

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in before changing your password.';
    case 'auth/email-already-verified':
      return 'Your email address is already verified.';
    case 'auth/invalid-action-code':
      return 'The verification link is invalid or has expired.';
    case 'auth/expired-action-code':
      return 'The verification link has expired. Please request a new one.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Sending password reset email to:', email);
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent');
    logger.info('Password reset email sent', { email });
    return { success: true };
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    logger.error('Password reset error', { errorCode: error.code, errorMessage: error.message, email });
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code) 
    };
  }
}

/**
 * Resend email verification
 */
export async function resendEmailVerification(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user is currently signed in.' };
    }

    if (user.emailVerified) {
      return { success: false, error: 'Your email is already verified.' };
    }

    console.log('📧 Resending email verification to:', user.email);
    await sendEmailVerification(user);
    console.log('✅ Email verification resent');
    logger.info('Email verification resent', { uid: user.uid, email: user.email });
    return { success: true };
  } catch (error: any) {
    console.error('❌ Email verification resend error:', error);
    logger.error('Email verification resend error', { errorCode: error.code, errorMessage: error.message });
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code) 
    };
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'No user is currently signed in.' };
    }

    // Re-authenticate user before updating password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    logger.info('Password updated successfully', { uid: user.uid });
    return { success: true };
  } catch (error: any) {
    console.error('❌ Password update error:', error);
    logger.error('Password update error', { errorCode: error.code, errorMessage: error.message });
    return { 
      success: false, 
      error: getAuthErrorMessage(error.code) 
    };
  }
}

/**
 * Set up auth state listener
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  // If Firebase auth is not available, return a no-op function and call callback with null
  if (!auth) {
    console.warn('⚠️ Firebase auth not available, running in development mode');
    callback(null);
    return () => {}; // Return no-op unsubscribe function
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      console.log('🔄 Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'Signed out');

      if (firebaseUser) {
        console.log('👤 Getting user document for:', firebaseUser.uid);
        const user = await getUserDocument(firebaseUser.uid);
        if (user) {
          console.log('✅ User document found:', user.name, user.role);
          callback(user);
        } else {
          console.warn('⚠️ User document not found, user may need to complete registration');
          callback(null);
        }
      } else {
        console.log('👤 User signed out');
        callback(null);
      }
    } catch (error) {
      console.error('❌ Error in auth state change:', error);
      callback(null);
    }
  });
}