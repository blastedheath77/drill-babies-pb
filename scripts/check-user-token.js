#!/usr/bin/env node

/**
 * Check if user has a calendar subscription token in Firestore
 * Usage: node scripts/check-user-token.js YOUR_EMAIL
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

async function checkUserToken(email) {
  console.log(`\n🔍 Checking calendar token for: ${email}\n`);

  try {
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('❌ User not found with email:', email);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log('✅ User found:');
    console.log(`   ID: ${userId}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Email: ${userData.email}`);
    console.log('');

    // Check token
    if (userData.calendarSubscriptionToken) {
      console.log('✅ Calendar subscription token exists:');
      console.log(`   Token: ${userData.calendarSubscriptionToken}`);
      console.log(`   Created: ${userData.calendarSubscriptionCreatedAt?.toDate?.() || 'Unknown'}`);
      console.log('');

      // Build the feed URL (you'll need to update the domain)
      console.log('🔗 Subscription URLs:');
      console.log(`   Local: http://localhost:3000/api/calendar/feed/${userData.calendarSubscriptionToken}`);
      console.log(`   Production: https://YOUR-APP.vercel.app/api/calendar/feed/${userData.calendarSubscriptionToken}`);
      console.log('');
      console.log('💡 Replace YOUR-APP with your actual Vercel domain');
    } else {
      console.log('❌ No calendar subscription token found');
      console.log('');
      console.log('To generate a token:');
      console.log('1. Go to Settings → Calendar Integration');
      console.log('2. The token should be automatically generated');
      console.log('3. If not, try clicking "Regenerate Subscription URL"');
    }

    // Check for RSVPs
    console.log('\n📊 Checking RSVPs...');
    const rsvpsSnapshot = await db.collection('eventRsvps')
      .where('userId', '==', userId)
      .where('response', '==', 'yes')
      .get();

    console.log(`   "Yes" RSVPs: ${rsvpsSnapshot.size}`);

    if (rsvpsSnapshot.size > 0) {
      console.log('\n📅 Events:');
      for (const rsvpDoc of rsvpsSnapshot.docs) {
        const rsvp = rsvpDoc.data();
        const eventDoc = await db.collection('events').doc(rsvp.eventId).get();
        if (eventDoc.exists) {
          const event = eventDoc.data();
          console.log(`   - ${event.title} (${event.startTime.toDate().toLocaleDateString()})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide your email address');
  console.log('\nUsage: node scripts/check-user-token.js your@email.com');
  process.exit(1);
}

checkUserToken(email).finally(() => process.exit(0));
