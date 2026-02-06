import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

interface Event {
  id: string;
  clubId: string;
  title: string;
  description?: string;
  type: 'training' | 'league_match' | 'friendly' | 'other';
  customType?: string;
  startTime: admin.firestore.Timestamp;
  endTime: admin.firestore.Timestamp;
  location?: string;
  createdBy: string;
  isRecurringInstance: boolean;
  recurrenceIndex?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  clubMemberships: string[];
  notificationSettings?: {
    eventsEnabled: boolean;
    fcmToken?: string;
  };
}

/**
 * Cloud Function triggered when a new event is created.
 * Sends push notifications to all club members who have event notifications enabled.
 */
export const onEventCreated = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snapshot, context) => {
    const eventId = context.params.eventId;
    const eventData = snapshot.data() as Event;

    // Skip notifications for recurring instances beyond the first one
    // to avoid spamming users with multiple notifications
    if (eventData.isRecurringInstance && eventData.recurrenceIndex && eventData.recurrenceIndex > 0) {
      console.log(`Skipping notification for recurring event instance ${eventData.recurrenceIndex}`);
      return null;
    }

    const clubId = eventData.clubId;

    try {
      // TEST MODE: If TEST_USER_ID is set, only send to that user
      const testUserId = functions.config().test?.user_id;
      if (testUserId) {
        console.log(`TEST MODE: Only sending notifications to user ${testUserId}`);
      }

      // Get all users who are members of this club and have event notifications enabled
      const usersSnapshot = await db
        .collection('users')
        .where('clubMemberships', 'array-contains', clubId)
        .get();

      const tokensToSend: string[] = [];
      const userIdsToSend: string[] = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as User;

        // TEST MODE: Skip all users except the test user
        if (testUserId && doc.id !== testUserId) {
          return;
        }

        // Skip the user who created the event (unless they're the test user)
        if (doc.id === eventData.createdBy && !testUserId) {
          return;
        }

        // Check if user has event notifications enabled and has an FCM token
        if (
          userData.notificationSettings?.eventsEnabled &&
          userData.notificationSettings?.fcmToken
        ) {
          tokensToSend.push(userData.notificationSettings.fcmToken);
          userIdsToSend.push(doc.id);
        }
      });

      if (tokensToSend.length === 0) {
        console.log('No users to notify for event:', eventId);
        return null;
      }

      // Format the event type for display
      const eventTypeLabels: Record<string, string> = {
        training: 'Training',
        league_match: 'League Match',
        friendly: 'Friendly',
        other: eventData.customType || 'Event',
      };
      const eventTypeLabel = eventTypeLabels[eventData.type] || 'Event';

      // Format the start time
      const startTime = eventData.startTime.toDate();
      const formattedDate = startTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      // Prepare notification payload
      const notificationTitle = `New ${eventTypeLabel}: ${eventData.title}`;
      const notificationBody = `${formattedDate} at ${formattedTime}${
        eventData.location ? ` - ${eventData.location}` : ''
      }`;

      const message: admin.messaging.MulticastMessage = {
        tokens: tokensToSend,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: 'event',
          eventId: eventId,
          clubId: clubId,
          url: `/events/${eventId}`,
          title: notificationTitle,
          body: notificationBody,
        },
        webpush: {
          fcmOptions: {
            link: `/events/${eventId}`,
          },
        },
      };

      // Send notifications
      const response = await messaging.sendEachForMulticast(message);

      console.log(
        `Sent ${response.successCount} notifications for event ${eventId}. ` +
        `Failures: ${response.failureCount}`
      );

      // Handle failed tokens (they might be invalid/expired)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // Remove invalid tokens
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokensToSend[idx]);
              console.log(`Removing invalid token for user ${userIdsToSend[idx]}`);

              // Remove the invalid token from the user's document
              db.collection('users').doc(userIdsToSend[idx]).update({
                'notificationSettings.fcmToken': admin.firestore.FieldValue.delete(),
              }).catch((err) => {
                console.error(`Failed to remove token for user ${userIdsToSend[idx]}:`, err);
              });
            }
          }
        });
      }

      return null;
    } catch (error) {
      console.error('Error sending event notifications:', error);
      throw error;
    }
  });
