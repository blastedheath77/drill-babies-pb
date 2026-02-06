import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all triggers
export { onEventCreated } from './triggers/event-created';
