// Game and Rating Constants - DUPR Style (2.0-8.0)
export const DEFAULT_RATING = 3.5; // Starting rating for new players
export const MIN_RATING = 2.0;
export const MAX_RATING = 8.0;
export const RATING_K_FACTOR = 0.08; // Reduced factor for more conservative rating changes

// Avatar and Display Constants
export const DEFAULT_AVATAR_URL = 'https://placehold.co/100x100.png';

// Database Constants
export const FIRESTORE_BATCH_LIMIT = 30; // Maximum items in Firestore 'in' query
