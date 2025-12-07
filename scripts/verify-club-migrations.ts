#!/usr/bin/env tsx
/**
 * Verification Script: Check all data has clubId assigned
 *
 * This script verifies that all entities have been successfully
 * migrated to include a clubId field.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface VerificationResult {
  collectionName: string;
  total: number;
  withClubId: number;
  withoutClubId: number;
  percentage: number;
}

async function verifyCollection(collectionName: string): Promise<VerificationResult> {
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);

  let withClubId = 0;
  let withoutClubId = 0;
  const itemsWithoutClubId: string[] = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.clubId) {
      withClubId++;
    } else {
      withoutClubId++;
      const name = data.name || doc.id;
      itemsWithoutClubId.push(name);
    }
  });

  const total = snapshot.size;
  const percentage = total > 0 ? (withClubId / total) * 100 : 100;

  // Display items without clubId if any
  if (itemsWithoutClubId.length > 0) {
    console.log(`  ⚠️  Items without clubId in ${collectionName}:`);
    itemsWithoutClubId.forEach((name) => {
      console.log(`     - ${name}`);
    });
  }

  return {
    collectionName,
    total,
    withClubId,
    withoutClubId,
    percentage,
  };
}

async function verifyAllMigrations() {
  console.log('🔍 Verifying club migrations across all collections...\n');
  console.log('='.repeat(70));

  const collections = ['players', 'games', 'tournaments', 'circles', 'boxLeagues'];
  const results: VerificationResult[] = [];

  for (const collectionName of collections) {
    console.log(`\n📊 Checking ${collectionName}...`);
    const result = await verifyCollection(collectionName);
    results.push(result);

    const statusIcon = result.percentage === 100 ? '✅' : '⚠️';
    console.log(`${statusIcon} ${result.total} total | ${result.withClubId} with clubId | ${result.withoutClubId} without clubId (${result.percentage.toFixed(1)}%)`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  console.log('\nCollection          Total    With ClubId    Without    Complete');
  console.log('-'.repeat(70));

  results.forEach((result) => {
    const statusIcon = result.percentage === 100 ? '✅' : '⚠️';
    const collectionPadded = result.collectionName.padEnd(15);
    const totalPadded = String(result.total).padStart(7);
    const withPadded = String(result.withClubId).padStart(12);
    const withoutPadded = String(result.withoutClubId).padStart(10);
    const percentPadded = `${result.percentage.toFixed(1)}%`.padStart(10);

    console.log(`${collectionPadded} ${totalPadded} ${withPadded} ${withoutPadded} ${percentPadded} ${statusIcon}`);
  });

  console.log('='.repeat(70));

  const allComplete = results.every((r) => r.percentage === 100);
  const totalItems = results.reduce((sum, r) => sum + r.total, 0);
  const totalWithClubId = results.reduce((sum, r) => sum + r.withClubId, 0);
  const totalWithoutClubId = results.reduce((sum, r) => sum + r.withoutClubId, 0);
  const overallPercentage = totalItems > 0 ? (totalWithClubId / totalItems) * 100 : 100;

  console.log(`\nOverall:            ${totalItems}     ${totalWithClubId}          ${totalWithoutClubId}      ${overallPercentage.toFixed(1)}%`);
  console.log('='.repeat(70));

  if (allComplete) {
    console.log('\n✨ All collections fully migrated! Migration complete.');
  } else {
    console.log('\n⚠️  Some collections are missing clubId. Please run the appropriate migration scripts.');
  }
}

// Run the verification
verifyAllMigrations()
  .then(() => {
    console.log('\n👋 Verification finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error during verification:', error);
    process.exit(1);
  });
