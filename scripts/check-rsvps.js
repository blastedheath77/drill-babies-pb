#!/usr/bin/env node

/**
 * Debug script to check user's RSVPs and test calendar feed
 * Usage: node scripts/check-rsvps.js YOUR_USER_ID
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function checkUserRsvps(userId) {
  console.log(`\n🔍 Checking RSVPs for user: ${userId}\n`);

  // Get user info
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    console.error('❌ User not found');
    return;
  }

  const userData = userDoc.data();
  console.log(`👤 User: ${userData.name} (${userData.email})`);
  console.log(`🎫 Subscription Token: ${userData.calendarSubscriptionToken ? '✅ Generated' : '❌ Not generated'}`);

  // Get all user's RSVPs
  const rsvpsSnapshot = await db
    .collection('eventRsvps')
    .where('userId', '==', userId)
    .get();

  console.log(`\n📊 Total RSVPs: ${rsvpsSnapshot.size}`);

  if (rsvpsSnapshot.empty) {
    console.log('\n⚠️  No RSVPs found! You need to RSVP "Yes" to some events first.');
    return;
  }

  // Group by response type
  const rsvpsByResponse = { yes: [], maybe: [], no: [] };
  for (const doc of rsvpsSnapshot.docs) {
    const data = doc.data();
    rsvpsByResponse[data.response].push(data);
  }

  console.log(`  - Yes: ${rsvpsByResponse.yes.length}`);
  console.log(`  - Maybe: ${rsvpsByResponse.maybe.length}`);
  console.log(`  - No: ${rsvpsByResponse.no.length}`);

  if (rsvpsByResponse.yes.length === 0) {
    console.log('\n⚠️  No "Yes" RSVPs found! Calendar feed will be empty.');
    console.log('   → Go to the Events page and RSVP "Yes" to some events.');
    return;
  }

  // Check the events
  console.log(`\n📅 Events with "Yes" RSVP:\n`);
  for (const rsvp of rsvpsByResponse.yes) {
    const eventDoc = await db.collection('events').doc(rsvp.eventId).get();
    if (eventDoc.exists) {
      const event = eventDoc.data();
      const startTime = event.startTime.toDate();
      const status = event.status || 'scheduled';
      const emoji = status === 'cancelled' ? '🚫' : '✅';
      
      console.log(`${emoji} ${event.title}`);
      console.log(`   Date: ${startTime.toLocaleString()}`);
      console.log(`   Status: ${status}`);
      console.log(`   Location: ${event.location || 'N/A'}`);
      console.log('');
    }
  }

  // Test the feed URL
  if (userData.calendarSubscriptionToken) {
    const feedUrl = `http://localhost:3000/api/calendar/feed/${userData.calendarSubscriptionToken}`;
    console.log(`\n🔗 Your calendar feed URL:`);
    console.log(`   ${feedUrl}`);
    console.log(`\n💡 Tip: Open this URL in your browser to see the raw ICS feed`);
  }
}

// Get user ID from command line
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Please provide your user ID');
  console.log('\nUsage: node scripts/check-rsvps.js YOUR_USER_ID');
  console.log('\nTo find your user ID:');
  console.log('1. Go to the app and open browser DevTools (F12)');
  console.log('2. Go to Application → Local Storage');
  console.log('3. Look for your user ID in the stored data');
  process.exit(1);
}

checkUserRsvps(userId).catch(console.error).finally(() => process.exit(0));
