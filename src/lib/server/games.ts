/**
 * Server-only game writes (Admin SDK). These are the only code paths that
 * change player ratings and stat totals; Firestore rules block the browser
 * from writing those fields directly.
 */
import { adminDb, admin } from '@/lib/firebase-admin';
import { CLUB_ID } from '@/config/club';
import {
  computeGameRatings,
  gameStatDelta,
  replayFrom,
  type GameInput,
  type RatingChanges,
  type ReplayGame,
} from '@/lib/rating-engine';

const { FieldValue, Timestamp } = admin.firestore;
const BATCH_LIMIT = 450;

export interface RecordGameInput extends GameInput {
  tournamentId?: string;
  /** When set, the tournament match is marked completed in the same transaction. */
  tournamentMatchId?: string;
  createdBy: string;
}

function validateGame(game: GameInput) {
  const ids = [...game.team1PlayerIds, ...game.team2PlayerIds];
  if (game.team1PlayerIds.length === 0 || game.team2PlayerIds.length === 0) {
    throw new Error('Each team needs at least one player');
  }
  if (game.team1PlayerIds.length !== game.team2PlayerIds.length || game.team1PlayerIds.length > 2) {
    throw new Error('Games must be singles (1 v 1) or doubles (2 v 2)');
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error('Each player can only be selected once');
  }
  for (const s of [game.team1Score, game.team2Score]) {
    if (!Number.isInteger(s) || s < 0 || s > 50) throw new Error('Scores must be whole numbers from 0 to 50');
  }
}

/**
 * Records a new game. It is always the latest game, so ratings update
 * incrementally inside a transaction (safe if two phones log at once).
 */
export async function recordGame(input: RecordGameInput): Promise<{ gameId: string; ratingChanges: RatingChanges }> {
  validateGame(input);
  const db = adminDb();
  const allIds = [...input.team1PlayerIds, ...input.team2PlayerIds];
  const gameRef = db.collection('games').doc();

  const ratingChanges = await db.runTransaction(async (tx) => {
    const refs = allIds.map((id) => db.collection('players').doc(id));
    const snaps = await tx.getAll(...refs);

    let matchRef: FirebaseFirestore.DocumentReference | null = null;
    if (input.tournamentMatchId) {
      matchRef = db.collection('tournamentMatches').doc(input.tournamentMatchId);
      const match = await tx.get(matchRef);
      if (!match.exists) throw new Error('Match not found');
      if (match.get('status') === 'completed') throw new Error('This match already has a result');
    }
    const ratings: { [id: string]: number } = {};
    snaps.forEach((snap) => {
      if (!snap.exists) throw new Error('One of the selected players no longer exists');
      ratings[snap.id] = snap.get('rating');
    });

    const changes = computeGameRatings(input, ratings);

    for (const snap of snaps) {
      const d = gameStatDelta(input, snap.id);
      tx.update(snap.ref, {
        rating: changes[snap.id]?.after ?? snap.get('rating'),
        wins: FieldValue.increment(d.wins),
        losses: FieldValue.increment(d.losses),
        draws: FieldValue.increment(d.draws),
        pointsFor: FieldValue.increment(d.pointsFor),
        pointsAgainst: FieldValue.increment(d.pointsAgainst),
      });
    }

    tx.set(gameRef, {
      type: input.team1PlayerIds.length === 1 ? 'Singles' : 'Doubles',
      date: FieldValue.serverTimestamp(),
      team1: { playerIds: input.team1PlayerIds, score: input.team1Score },
      team2: { playerIds: input.team2PlayerIds, score: input.team2Score },
      playerIds: allIds,
      clubId: CLUB_ID,
      ratingChanges: changes,
      createdBy: input.createdBy,
      ...(input.tournamentId ? { tournamentId: input.tournamentId } : {}),
    });

    if (matchRef) tx.update(matchRef, { status: 'completed', gameId: gameRef.id });

    return changes;
  });

  return { gameId: gameRef.id, ratingChanges };
}

interface StoredGame extends ReplayGame {
  millis: number;
  ref: FirebaseFirestore.DocumentReference;
  tournamentId?: string;
}

async function loadAllGamesChronological(): Promise<StoredGame[]> {
  const snap = await adminDb().collection('games').where('clubId', '==', CLUB_ID).get();
  const games = snap.docs.map((doc) => {
    const d = doc.data();
    const date = d.date;
    const millis =
      date instanceof Timestamp ? date.toMillis() : typeof date === 'string' ? Date.parse(date) : 0;
    return {
      id: doc.id,
      ref: doc.ref,
      millis,
      team1PlayerIds: d.team1?.playerIds ?? [],
      team2PlayerIds: d.team2?.playerIds ?? [],
      team1Score: d.team1?.score ?? 0,
      team2Score: d.team2?.score ?? 0,
      ratingChanges: d.ratingChanges,
      tournamentId: d.tournamentId,
    } as StoredGame;
  });
  games.sort((a, b) => a.millis - b.millis || a.id.localeCompare(b.id));
  return games;
}

/**
 * Applies edits/deletions to one or more games and replays ratings for every
 * game after the earliest one changed. Ratings before that stay as stored.
 */
async function rewriteHistory(edits: Map<string, GameInput | null>): Promise<void> {
  const db = adminDb();
  const games = await loadAllGamesChronological();
  const indexes = [...edits.keys()].map((id) => games.findIndex((g) => g.id === id));
  if (indexes.some((i) => i === -1)) throw new Error('Game not found');
  const index = Math.min(...indexes);

  // Current ratings of players added by an edit, used only for a player with no stored history
  const fallback: { [id: string]: number } = {};
  const addedIds = [...edits.values()].flatMap((g) => (g ? [...g.team1PlayerIds, ...g.team2PlayerIds] : []));
  if (addedIds.length) {
    const snaps = await db.getAll(...[...new Set(addedIds)].map((id) => db.collection('players').doc(id)));
    snaps.forEach((snap) => {
      if (!snap.exists) throw new Error('One of the selected players no longer exists');
      fallback[snap.id] = snap.get('rating');
    });
  }

  const timeline: StoredGame[] = [];
  for (const g of games) {
    if (!edits.has(g.id)) timeline.push(g);
    else if (edits.get(g.id)) timeline.push({ ...g, ...edits.get(g.id)! });
  }

  const { changes, finalRatings } = replayFrom(timeline, index, fallback, games);

  // Stat totals are additive: remove each original game, add its replacement.
  const statDeltas: { [id: string]: { wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number } } = {};
  const addDelta = (game: GameInput, sign: 1 | -1) => {
    for (const id of [...game.team1PlayerIds, ...game.team2PlayerIds]) {
      const d = gameStatDelta(game, id);
      const t = (statDeltas[id] ??= { wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 });
      t.wins += sign * d.wins;
      t.losses += sign * d.losses;
      t.draws += sign * d.draws;
      t.pointsFor += sign * d.pointsFor;
      t.pointsAgainst += sign * d.pointsAgainst;
    }
  };

  type Write = (b: FirebaseFirestore.WriteBatch) => void;
  const writes: Write[] = [];

  for (const [gameId, replacement] of edits) {
    const original = games.find((g) => g.id === gameId)!;
    addDelta(original, -1);
    if (replacement) {
      addDelta(replacement, 1);
      writes.push((b) =>
        b.update(original.ref, {
          type: replacement.team1PlayerIds.length === 1 ? 'Singles' : 'Doubles',
          team1: { playerIds: replacement.team1PlayerIds, score: replacement.team1Score },
          team2: { playerIds: replacement.team2PlayerIds, score: replacement.team2Score },
          playerIds: [...replacement.team1PlayerIds, ...replacement.team2PlayerIds],
          ratingChanges: changes[original.id] ?? {},
          editedAt: FieldValue.serverTimestamp(),
        })
      );
    } else {
      writes.push((b) => b.delete(original.ref));
      if (original.tournamentId) {
        const matches = await db.collection('tournamentMatches').where('gameId', '==', original.id).get();
        matches.docs.forEach((m) =>
          writes.push((b) => b.update(m.ref, { status: 'pending', gameId: FieldValue.delete() }))
        );
      }
    }
  }

  // Final rating of every affected player: the result of their last remaining
  // game (recomputed if in the replay window), or their starting rating if
  // none of their games remain.
  const affected = new Set([...Object.keys(finalRatings), ...Object.keys(statDeltas)]);
  const ratingOf: { [id: string]: number } = {};
  for (const id of affected) {
    let rating: number | undefined;
    for (let i = timeline.length - 1; i >= 0 && rating === undefined; i--) {
      const g = timeline[i];
      if (![...g.team1PlayerIds, ...g.team2PlayerIds].includes(id)) continue;
      rating = i >= index ? changes[g.id]?.[id]?.after : g.ratingChanges?.[id]?.after;
    }
    if (rating === undefined) {
      rating = games.find((g) => g.ratingChanges?.[id])?.ratingChanges?.[id]?.before;
    }
    if (rating !== undefined) ratingOf[id] = rating;
  }

  for (const game of timeline.slice(index)) {
    if (edits.has(game.id)) continue;
    writes.push((b) => b.update(game.ref, { ratingChanges: changes[game.id] ?? {} }));
  }

  for (const id of affected) {
    const ref = db.collection('players').doc(id);
    const d = statDeltas[id];
    writes.push((b) =>
      b.update(ref, {
        ...(ratingOf[id] !== undefined ? { rating: ratingOf[id] } : {}),
        ...(d
          ? {
              wins: FieldValue.increment(d.wins),
              losses: FieldValue.increment(d.losses),
              draws: FieldValue.increment(d.draws),
              pointsFor: FieldValue.increment(d.pointsFor),
              pointsAgainst: FieldValue.increment(d.pointsAgainst),
            }
          : {}),
      })
    );
  }

  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    writes.slice(i, i + BATCH_LIMIT).forEach((w) => w(batch));
    await batch.commit();
  }
}

export async function deleteGame(gameId: string): Promise<void> {
  await rewriteHistory(new Map([[gameId, null]]));
}

/** Deletes several games (e.g. a whole tournament) with a single replay. */
export async function deleteGames(gameIds: string[]): Promise<void> {
  if (gameIds.length === 0) return;
  await rewriteHistory(new Map(gameIds.map((id) => [id, null])));
}

export async function editGame(gameId: string, replacement: GameInput): Promise<void> {
  validateGame(replacement);
  await rewriteHistory(new Map([[gameId, replacement]]));
}
