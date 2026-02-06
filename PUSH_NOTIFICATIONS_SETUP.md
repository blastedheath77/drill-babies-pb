# Push Notifications Setup Guide

Complete step-by-step guide to enable push notifications for the Events feature.

## Overview

This guide will help you:
1. Configure Firebase Cloud Messaging (FCM)
2. Set up Cloud Functions
3. Deploy the notification trigger
4. Test push notifications

---

## Part 1: Firebase Cloud Messaging (FCM) Setup

### Step 1.1: Enable Cloud Messaging in Firebase Console

1. Open your browser and go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pbstats-claude**
3. Click on the ⚙️ **Settings** icon (top left, next to "Project Overview")
4. Select **Project settings**
5. Click on the **Cloud Messaging** tab
6. You should see:
   - **Cloud Messaging API (Legacy)** - This might be already enabled
   - **Cloud Messaging API (V1)** - Newer version (recommended)

### Step 1.2: Generate Web Push Certificate (VAPID Keys)

1. Still in **Project Settings** → **Cloud Messaging** tab
2. Scroll down to **Web Push certificates** section
3. If you don't have a key pair, click **Generate key pair**
4. Copy the key that appears (starts with `B...`)
5. You'll need this key in Step 1.3

**Example key format:**
```
BMvQ3x8K...very-long-string...abc123
```

### Step 1.3: Update Firebase Configuration

Open `src/lib/firebase-config.ts` and add the VAPID key:

```typescript
export const firebaseConfig = {
  apiKey: 'AIzaSyCV123...',
  authDomain: 'pbstats-claude.firebaseapp.com',
  projectId: 'pbstats-claude',
  storageBucket: 'pbstats-claude.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
  measurementId: 'G-XXXXXXXXXX'
};

// Add this VAPID key from Firebase Console
export const vapidKey = 'YOUR_VAPID_KEY_HERE'; // Paste the key from Step 1.2
```

### Step 1.4: Enable Cloud Messaging API in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **pbstats-claude**
3. In the search bar at the top, type: **Cloud Messaging API**
4. Click on **Firebase Cloud Messaging API**
5. If it says "Enable", click the **Enable** button
6. Wait for it to activate (takes ~1 minute)

---

## Part 2: Cloud Functions Setup

### Step 2.1: Install Functions Dependencies

```bash
cd functions
npm install
```

This installs:
- `firebase-admin` - Server-side Firebase SDK
- `firebase-functions` - Cloud Functions SDK
- `typescript` - For TypeScript support

### Step 2.2: Verify Functions Code

Check that these files exist:
- ✅ `functions/package.json`
- ✅ `functions/tsconfig.json`
- ✅ `functions/src/index.ts`
- ✅ `functions/src/triggers/event-created.ts`

Build the functions to check for errors:

```bash
npm run build
```

You should see output like:
```
Compiling TypeScript...
✓ TypeScript compilation successful
```

### Step 2.3: Initialize Firebase Admin SDK Service Account (Optional but Recommended)

For better security in production, download a service account key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Settings** → **Project settings**
4. Click **Service accounts** tab
5. Click **Generate new private key** button
6. Save the JSON file as `functions/service-account-key.json`
7. **IMPORTANT:** Add this to `.gitignore`:

```bash
echo "functions/service-account-key.json" >> .gitignore
```

8. Update `functions/src/index.ts` to use the service account:

```typescript
import * as admin from 'firebase-admin';

// For local development with service account
// const serviceAccount = require('../service-account-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// For production (uses default credentials)
admin.initializeApp();
```

**Note:** For now, use default initialization. Add service account only if you encounter permission issues.

---

## Part 3: Deploy Cloud Functions

### Step 3.1: Login to Firebase CLI

```bash
firebase login
```

This opens your browser. Log in with the Google account that owns the Firebase project.

### Step 3.2: Set the Active Project

```bash
firebase use pbstats-claude
```

Or if you have multiple projects:

```bash
firebase projects:list
firebase use <project-id>
```

### Step 3.3: Deploy Firestore Rules (if not already done)

```bash
firebase deploy --only firestore:rules
```

Expected output:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/pbstats-claude/overview
```

### Step 3.4: Deploy the Cloud Function

From the project root:

```bash
firebase deploy --only functions:onEventCreated
```

**What happens:**
1. Functions code is built (TypeScript → JavaScript)
2. Code is uploaded to Google Cloud
3. Function is deployed and activated

**Expected output:**
```
=== Deploying to 'pbstats-claude'...

i  deploying functions
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (123 KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating function onEventCreated(us-central1)...
✔  functions[onEventCreated(us-central1)]: Successful create operation.
✔  functions: all functions deployed successfully!

✔  Deploy complete!
```

**If you see errors:**

**Error: "HTTP Error: 403, Permission denied"**
- Solution: Enable Cloud Functions API in Google Cloud Console
- Go to: https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com
- Click "Enable"

**Error: "Billing account required"**
- Solution: Firebase requires Blaze (pay-as-you-go) plan for Cloud Functions
- Go to Firebase Console → ⚙️ → Usage and billing → Details & settings
- Click "Modify plan" → Select "Blaze"
- Don't worry: Free tier includes:
  - 2M function invocations/month
  - 400,000 GB-seconds compute time
  - Your usage will likely stay in free tier

---

## Part 4: Update Client-Side FCM Integration

### Step 4.1: Create FCM Initialization File

Create `src/lib/firebase-messaging.ts`:

```typescript
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { vapidKey } from './firebase-config';
import { logger } from './logger';

let messaging: any = null;

// Initialize messaging only in browser and if supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    logger.warn('Firebase Messaging not available:', error);
  }
}

/**
 * Request permission and get FCM token
 */
export async function requestFcmToken(): Promise<string | null> {
  if (!messaging) {
    logger.warn('Messaging not initialized');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      logger.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    logger.info('FCM token obtained');
    return token;
  } catch (error) {
    logger.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    logger.info('Foreground message received:', payload);
    callback(payload);
  });
}
```

### Step 4.2: Update Notifications Library

Update `src/lib/notifications.ts` to use FCM:

Find the `enableEventNotifications` function and update it:

```typescript
import { requestFcmToken } from './firebase-messaging';

export async function enableEventNotifications(userId: string): Promise<boolean> {
  try {
    // First, request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      return false;
    }

    // Get FCM token
    const fcmToken = await requestFcmToken();
    if (!fcmToken) {
      logger.warn('Failed to get FCM token');
      return false;
    }

    // Save token and enable notifications
    await saveFcmToken(userId, fcmToken);
    await updateUserNotificationSettings(userId, { eventsEnabled: true });

    return true;
  } catch (error) {
    logger.error('Error enabling event notifications:', error);
    return false;
  }
}
```

---

## Part 5: Testing Push Notifications

### Test 5.1: Local Testing (Before Deployment)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open the app:** http://localhost:3000

3. **Navigate to Events page:** http://localhost:3000/events

4. **Scroll down to Notification Settings card**

5. **Click "Enable Notifications"**
   - Browser will prompt: "Allow pbstats to send notifications?"
   - Click **Allow**

6. **Toggle "Event Notifications" switch to ON**
   - If you see errors in console, check:
     - VAPID key is correct in firebase-config.ts
     - Service worker is registered (check DevTools → Application → Service Workers)

### Test 5.2: Test Notification Trigger

1. **Create a test event as a club admin:**
   - Go to: http://localhost:3000/events
   - Click "Create Event"
   - Fill in the form:
     - Title: "Test Push Notification"
     - Type: Training
     - Date: Tomorrow
     - Time: 6:00 PM
   - Click "Create Event"

2. **Check Cloud Function logs:**
   ```bash
   firebase functions:log --only onEventCreated
   ```

   You should see:
   ```
   Function execution started
   Sent 1 notifications for event xyz123
   Function execution took 1234 ms
   ```

3. **Check your browser:**
   - You should see a push notification appear
   - Click the notification to open the event detail page

### Test 5.3: Test with Multiple Users

1. **Open an Incognito/Private window**
2. **Sign in as a different user** (same club)
3. **Enable notifications** for that user
4. **Go back to normal window**
5. **Create another event as club admin**
6. **Both users should receive notification**

---

## Part 6: Troubleshooting

### Issue: "No FCM token obtained"

**Symptoms:** Toggle switch doesn't work, console shows "Failed to get FCM token"

**Solutions:**
1. Check VAPID key in `firebase-config.ts` matches Firebase Console
2. Verify Cloud Messaging API is enabled in Google Cloud Console
3. Check browser console for specific error messages
4. Try in Incognito mode (extensions can block notifications)
5. Check if service worker is registered: DevTools → Application → Service Workers

### Issue: "Firebase Messaging not available"

**Solution:** Make sure you're accessing via HTTPS or localhost (not HTTP)

### Issue: Notifications not appearing

**Check:**
1. **Browser permission:** DevTools → Console → Check for permission errors
2. **Service worker:** DevTools → Application → Service Workers → Should show "activated and running"
3. **FCM token saved:** Check Firestore → users → [userId] → notificationSettings.fcmToken
4. **Function logs:**
   ```bash
   firebase functions:log --only onEventCreated
   ```
5. **Browser notifications enabled:** System Settings → Notifications → Browser

### Issue: "Functions deployment failed"

**Common causes:**
1. **Billing not enabled:** Upgrade to Blaze plan
2. **APIs not enabled:**
   - Enable Cloud Functions API
   - Enable Cloud Messaging API
3. **TypeScript errors:**
   ```bash
   cd functions
   npm run build
   ```
   Fix any compilation errors

### Issue: "Permission denied" when sending notifications

**Solution:**
1. Check that Cloud Messaging API (V1) is enabled
2. Verify function has correct permissions:
   ```bash
   firebase deploy --only functions:onEventCreated
   ```

---

## Part 7: Production Deployment

### Step 7.1: Update Service Worker Version

Update the cache name in `public/sw.js`:

```javascript
const CACHE_NAME = 'pbstats-v0.1.1-' + Date.now(); // Increment version
```

### Step 7.2: Deploy to Production

```bash
# Deploy functions first
firebase deploy --only functions

# Then deploy rules
firebase deploy --only firestore:rules

# Deploy to Vercel/hosting
npm run build
# (or your deployment command)
```

### Step 7.3: Verify in Production

1. Open your production URL
2. Enable notifications
3. Create an event
4. Verify notification appears

---

## Part 8: Monitoring & Maintenance

### View Function Logs

```bash
# Recent logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --only onEventCreated

# View in Google Cloud Console
# https://console.cloud.google.com/functions/list
```

### Monitor Usage

1. **Firebase Console:**
   - Go to Functions tab
   - View invocation count, errors, execution time

2. **Google Cloud Console:**
   - More detailed metrics
   - Set up alerts for errors

### Update Function Code

When you update `functions/src/triggers/event-created.ts`:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:onEventCreated
```

---

## Summary Checklist

- [ ] Step 1: Enable FCM in Firebase Console
- [ ] Step 2: Generate VAPID key and add to firebase-config.ts
- [ ] Step 3: Enable Cloud Messaging API in Google Cloud
- [ ] Step 4: Install functions dependencies: `cd functions && npm install`
- [ ] Step 5: Build functions: `npm run build`
- [ ] Step 6: Login to Firebase: `firebase login`
- [ ] Step 7: Set project: `firebase use pbstats-claude`
- [ ] Step 8: Deploy function: `firebase deploy --only functions:onEventCreated`
- [ ] Step 9: Create firebase-messaging.ts with FCM integration
- [ ] Step 10: Test notification toggle in UI
- [ ] Step 11: Create test event and verify notification

---

## Cost Estimate

**Firebase Blaze (Pay-as-you-go) Plan:**
- **Free tier:** 2M function invocations/month
- **Your usage:** ~10-50 invocations/day = ~300-1,500/month
- **Cost:** $0/month (well within free tier)

**Only charged if you exceed free tier:**
- $0.40 per million invocations
- $0.0000025 per GB-second of compute time

---

## Need Help?

If you run into issues:

1. **Check Firebase Console logs:**
   - Firebase Console → Functions → Logs

2. **Check browser console:**
   - Press F12 → Console tab

3. **Test with cURL:**
   ```bash
   # Get your function URL from Firebase Console
   curl -X POST https://us-central1-pbstats-claude.cloudfunctions.net/onEventCreated
   ```

4. **Common commands:**
   ```bash
   # View functions
   firebase functions:list

   # Delete a function
   firebase functions:delete onEventCreated

   # View project info
   firebase projects:list
   ```

---

**Next Steps:** Follow the checklist above step-by-step. Start with Part 1 (FCM Setup) and work through to Part 8 (Monitoring). Let me know if you hit any issues!
