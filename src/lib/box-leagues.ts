import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  runTransaction,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  BoxLeague,
  Box,
  BoxLeagueRound,
  BoxLeagueMatch,
  BoxLeaguePlayerStats,
  BoxLeagueStanding
} from './types';

// Collection references
const BOX_LEAGUES_COLLECTION = 'boxLeagues';
const BOXES_COLLECTION = 'boxes';
const BOX_LEAGUE_ROUNDS_COLLECTION = 'boxLeagueRounds';
const BOX_LEAGUE_MATCHES_COLLECTION = 'boxLeagueMatches';
const BOX_LEAGUE_PLAYER_STATS_COLLECTION = 'boxLeaguePlayerStats';

// Box League Operations
export async function createBoxLeague(
  boxLeagueData: Omit<BoxLeague, 'id' | 'createdDate' | 'currentCycle' | 'currentRound'>
): Promise<string> {
  try {
    const batch = writeBatch(db);

    // Create the box league document
    const newBoxLeague: Omit<BoxLeague, 'id'> = {
      ...boxLeagueData,
      createdDate: new Date().toISOString(),
      currentCycle: 1,
      currentRound: 0, // Not started yet
    };

    const boxLeagueRef = doc(collection(db, BOX_LEAGUES_COLLECTION));
    batch.set(boxLeagueRef, newBoxLeague);

    // Atomically create all boxes for the league
    const boxCreatedDate = new Date().toISOString();
    for (let i = 1; i <= boxLeagueData.totalBoxes; i++) {
      const boxRef = doc(collection(db, BOXES_COLLECTION));
      const newBox: Omit<Box, 'id'> = {
        boxLeagueId: boxLeagueRef.id,
        boxNumber: i,
        playerIds: [],
        createdDate: boxCreatedDate,
      };
      batch.set(boxRef, newBox);
    }

    // Commit all changes atomically
    await batch.commit();

    return boxLeagueRef.id;
  } catch (error) {
    console.error('Error creating box league:', error);
    throw error;
  }
}

export async function getBoxLeagues(circleId?: string): Promise<BoxLeague[]> {
  try {
    const boxLeaguesRef = collection(db, BOX_LEAGUES_COLLECTION);
    let q;

    if (circleId) {
      q = query(boxLeaguesRef, where('circleId', '==', circleId));
    } else {
      q = query(boxLeaguesRef);
    }

    const querySnapshot = await getDocs(q);
    const boxLeagues = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxLeague));

    // Sort by createdDate in JavaScript to avoid needing a composite index
    return boxLeagues.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  } catch (error) {
    console.error('Error fetching box leagues:', error);
    throw error;
  }
}

export async function getBoxLeague(id: string): Promise<BoxLeague | null> {
  try {
    const docRef = doc(db, BOX_LEAGUES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BoxLeague;
    }
    return null;
  } catch (error) {
    console.error('Error fetching box league:', error);
    throw error;
  }
}

export async function updateBoxLeague(id: string, updates: Partial<BoxLeague>): Promise<void> {
  try {
    const docRef = doc(db, BOX_LEAGUES_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating box league:', error);
    throw error;
  }
}

export async function deleteBoxLeague(id: string): Promise<void> {
  try {
    // This should be a transaction that deletes all related data
    const batch = writeBatch(db);

    // Delete the box league
    const boxLeagueRef = doc(db, BOX_LEAGUES_COLLECTION, id);
    batch.delete(boxLeagueRef);

    // Delete all boxes
    const boxesQuery = query(collection(db, BOXES_COLLECTION), where('boxLeagueId', '==', id));
    const boxesSnapshot = await getDocs(boxesQuery);
    boxesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete all rounds
    const roundsQuery = query(collection(db, BOX_LEAGUE_ROUNDS_COLLECTION), where('boxLeagueId', '==', id));
    const roundsSnapshot = await getDocs(roundsQuery);
    roundsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete all matches
    const matchesQuery = query(collection(db, BOX_LEAGUE_MATCHES_COLLECTION), where('boxLeagueId', '==', id));
    const matchesSnapshot = await getDocs(matchesQuery);
    matchesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete all player stats
    const statsQuery = query(collection(db, BOX_LEAGUE_PLAYER_STATS_COLLECTION), where('boxLeagueId', '==', id));
    const statsSnapshot = await getDocs(statsQuery);
    statsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
  } catch (error) {
    console.error('Error deleting box league:', error);
    throw error;
  }
}

// Box Operations
export async function createBox(boxData: Omit<Box, 'id' | 'createdDate'>): Promise<string> {
  try {
    const newBox: Omit<Box, 'id'> = {
      ...boxData,
      createdDate: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, BOXES_COLLECTION), newBox);
    return docRef.id;
  } catch (error) {
    console.error('Error creating box:', error);
    throw error;
  }
}

export async function getBoxesByLeague(boxLeagueId: string): Promise<Box[]> {
  try {
    const q = query(
      collection(db, BOXES_COLLECTION),
      where('boxLeagueId', '==', boxLeagueId)
    );

    const querySnapshot = await getDocs(q);
    const boxes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Box));

    // Sort by boxNumber in JavaScript to avoid needing a composite index
    return boxes.sort((a, b) => a.boxNumber - b.boxNumber);
  } catch (error) {
    console.error('Error fetching boxes:', error);
    throw error;
  }
}

export async function updateBox(id: string, updates: Partial<Box>): Promise<void> {
  try {
    const docRef = doc(db, BOXES_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating box:', error);
    throw error;
  }
}

// Box League Round Operations
export async function createBoxLeagueRound(
  roundData: Omit<BoxLeagueRound, 'id' | 'createdDate' | 'matchIds'>
): Promise<string> {
  try {
    const newRound: Omit<BoxLeagueRound, 'id'> = {
      ...roundData,
      createdDate: new Date().toISOString(),
      matchIds: [], // Will be populated when matches are created
    };

    const docRef = await addDoc(collection(db, BOX_LEAGUE_ROUNDS_COLLECTION), newRound);
    return docRef.id;
  } catch (error) {
    console.error('Error creating box league round:', error);
    throw error;
  }
}

export async function getRoundsByLeague(boxLeagueId: string): Promise<BoxLeagueRound[]> {
  try {
    const q = query(
      collection(db, BOX_LEAGUE_ROUNDS_COLLECTION),
      where('boxLeagueId', '==', boxLeagueId)
    );

    const querySnapshot = await getDocs(q);
    const rounds = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxLeagueRound));

    // Sort by cycle and round in JavaScript to avoid needing a composite index
    return rounds.sort((a, b) => {
      if (a.cycleNumber !== b.cycleNumber) {
        return b.cycleNumber - a.cycleNumber; // Descending by cycle
      }
      return b.roundNumber - a.roundNumber; // Descending by round
    });
  } catch (error) {
    console.error('Error fetching rounds:', error);
    throw error;
  }
}

// Box League Match Operations
export async function createBoxLeagueMatch(
  matchData: Omit<BoxLeagueMatch, 'id'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, BOX_LEAGUE_MATCHES_COLLECTION), matchData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating box league match:', error);
    throw error;
  }
}

export async function getMatchesByRound(boxLeagueRoundId: string): Promise<BoxLeagueMatch[]> {
  try {
    const q = query(
      collection(db, BOX_LEAGUE_MATCHES_COLLECTION),
      where('boxLeagueRoundId', '==', boxLeagueRoundId)
    );

    const querySnapshot = await getDocs(q);
    const matches = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxLeagueMatch));

    // Sort by boxId and matchNumber in JavaScript to avoid needing a composite index
    return matches.sort((a, b) => {
      if (a.boxId !== b.boxId) {
        return a.boxId.localeCompare(b.boxId);
      }
      return a.matchNumber - b.matchNumber;
    });
  } catch (error) {
    console.error('Error fetching matches by round:', error);
    throw error;
  }
}

export async function getMatchesByBox(boxId: string): Promise<BoxLeagueMatch[]> {
  try {
    const q = query(
      collection(db, BOX_LEAGUE_MATCHES_COLLECTION),
      where('boxId', '==', boxId),
      orderBy('cycleNumber', 'desc'),
      orderBy('roundNumber', 'desc'),
      orderBy('matchNumber', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxLeagueMatch));
  } catch (error) {
    console.error('Error fetching matches by box:', error);
    throw error;
  }
}

export async function updateBoxLeagueMatch(id: string, updates: Partial<BoxLeagueMatch>): Promise<void> {
  try {
    const docRef = doc(db, BOX_LEAGUE_MATCHES_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating box league match:', error);
    throw error;
  }
}

// Box League Player Stats Operations
export async function createOrUpdatePlayerStats(
  statsData: Omit<BoxLeaguePlayerStats, 'id' | 'lastUpdated'>
): Promise<void> {
  try {
    // Use deterministic document ID based on boxLeagueId and playerId
    // This allows us to use transactions for race-condition-free updates
    const statsDocId = `${statsData.boxLeagueId}_${statsData.playerId}`;
    const statsRef = doc(db, BOX_LEAGUE_PLAYER_STATS_COLLECTION, statsDocId);

    // Use a transaction to ensure atomic read-modify-write
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);

      const statsWithTimestamp = {
        ...statsData,
        lastUpdated: new Date().toISOString()
      };

      if (!statsDoc.exists()) {
        // Create new stats
        transaction.set(statsRef, {
          id: statsDocId,
          ...statsWithTimestamp
        });
      } else {
        // Update existing stats
        transaction.update(statsRef, statsWithTimestamp);
      }
    });
  } catch (error) {
    console.error('Error creating/updating player stats:', error);
    throw error;
  }
}

export async function getPlayerStatsByLeague(boxLeagueId: string): Promise<BoxLeaguePlayerStats[]> {
  try {
    const q = query(
      collection(db, BOX_LEAGUE_PLAYER_STATS_COLLECTION),
      where('boxLeagueId', '==', boxLeagueId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxLeaguePlayerStats));
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
}

export async function getPlayerStatsByBox(boxId: string): Promise<BoxLeaguePlayerStats[]> {
  try {
    const q = query(
      collection(db, BOX_LEAGUE_PLAYER_STATS_COLLECTION),
      where('boxId', '==', boxId),
      orderBy('currentPosition', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxLeaguePlayerStats));
  } catch (error) {
    console.error('Error fetching player stats by box:', error);
    throw error;
  }
}