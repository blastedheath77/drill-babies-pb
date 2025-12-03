#!/usr/bin/env tsx

/**
 * Script to create a temporary admin account
 * Usage: npx tsx scripts/create-admin.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

async function createAdminUser() {
  console.log('🔥 Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = 'pbadmin@temp.com';
  const password = 'admin123'; // Firebase requires at least 6 characters
  const displayName = 'PBadmin';

  try {
    console.log(`\n👤 Creating admin user: ${email}`);

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Firebase Auth user created:', user.uid);

    // Update profile
    await updateProfile(user, { displayName });
    console.log('✅ Profile updated');

    // Create Firestore user document
    const userDoc = {
      uid: user.uid,
      email: email,
      name: displayName,
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      clubMemberships: [], // Empty for now, will be populated after migration
      selectedClubId: null,
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);
    console.log('✅ Firestore user document created');

    console.log(`\n✨ Admin account created successfully!`);
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👑 Role: admin`);
    console.log(`\n⚠️  Note: This account has no email verification requirement.`);
    console.log(`⚠️  Remember to delete this temporary account after testing!\n`);

    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.error('\n❌ Error: Email already in use');
      console.log('💡 The admin account may already exist. Try logging in with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}\n`);
    } else {
      console.error('\n❌ Error creating admin user:', error.code || error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser();
