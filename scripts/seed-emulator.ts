/**
 * Seeds the LOCAL Firebase emulators with a small test club.
 * Refuses to run unless the emulator environment variables are set, so it
 * can never touch the live database.
 *
 *   npm run emulators        # terminal 1
 *   npm run seed:emulator    # terminal 2
 *   npm run dev:emulator     # app on http://localhost:3001
 *
 * Test logins (emulator only):
 *   admin@pbstats.test / test-admin-pass   (admin)
 *   member@pbstats.test / test-member-pass (player)
 */
import { adminAuth, adminDb, admin } from '../src/lib/firebase-admin';
import { CLUB_ID } from '../src/config/club';
import { recordGame } from '../src/lib/server/games';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set.');
  process.exit(1);
}

const USERS = [
  { email: 'admin@pbstats.test', password: 'test-admin-pass', name: 'Alex Admin', role: 'admin' },
  { email: 'member@pbstats.test', password: 'test-member-pass', name: 'Morgan Member', role: 'player' },
] as const;

const PLAYERS: { name: string; rating: number; gender: 'he' | 'she' }[] = [
  { name: 'Alex Admin', rating: 3.6, gender: 'he' },
  { name: 'Morgan Member', rating: 3.2, gender: 'she' },
  { name: 'Sam Carter', rating: 4.4, gender: 'he' },
  { name: 'Priya Shah', rating: 4.1, gender: 'she' },
  { name: 'Liam Brooks', rating: 3.9, gender: 'he' },
  { name: 'Nora Quinn', rating: 3.7, gender: 'she' },
  { name: 'Owen Price', rating: 3.4, gender: 'he' },
  { name: 'Hana Ito', rating: 3.3, gender: 'she' },
  { name: 'Ravi Patel', rating: 3.1, gender: 'he' },
  { name: 'Ella Ward', rating: 2.9, gender: 'she' },
  { name: 'Tom Reid', rating: 2.8, gender: 'he' },
  { name: 'Tom Ross', rating: 3.0, gender: 'he' },
];

async function clear() {
  const db = adminDb();
  for (const name of ['users', 'players', 'games', 'circles', 'tournaments', 'tournamentMatches', 'friendlies']) {
    const snap = await db.collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  const list = await adminAuth().listUsers();
  await Promise.all(list.users.map((u) => adminAuth().deleteUser(u.uid)));
}

async function main() {
  await clear();
  const db = adminDb();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const uids: Record<string, string> = {};
  for (const u of USERS) {
    const created = await adminAuth().createUser({ email: u.email, password: u.password, displayName: u.name });
    uids[u.email] = created.uid;
    await db.collection('users').doc(created.uid).set({
      uid: created.uid,
      email: u.email,
      name: u.name,
      role: u.role,
      clubMemberships: [CLUB_ID],
      createdAt: now,
      updatedAt: now,
    });
  }

  const ids: string[] = [];
  for (const p of PLAYERS) {
    const ref = await db.collection('players').add({
      ...p,
      nameLower: p.name.toLowerCase(),
      clubId: CLUB_ID,
      avatar: '',
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      createdAt: now,
    });
    ids.push(ref.id);
  }

  await db.collection('circles').add({
    name: 'Thursdays',
    description: 'Thursday training',
    playerIds: ids.slice(0, 8),
    clubId: CLUB_ID,
    createdBy: uids['admin@pbstats.test'],
    createdDate: new Date().toISOString(),
  });
  await db.collection('circles').add({
    name: 'Warriors',
    description: 'League team',
    playerIds: ids.slice(2, 8),
    clubId: CLUB_ID,
    createdBy: uids['admin@pbstats.test'],
    createdDate: new Date().toISOString(),
  });

  // A little history so ratings and stats aren't empty
  const games: [number[], number[], number, number][] = [
    [[2, 3], [4, 5], 11, 8],
    [[0, 1], [6, 7], 9, 11],
    [[2, 6], [3, 7], 11, 5],
  ];
  for (const [t1, t2, s1, s2] of games) {
    await recordGame({
      team1PlayerIds: t1.map((i) => ids[i]),
      team2PlayerIds: t2.map((i) => ids[i]),
      team1Score: s1,
      team2Score: s2,
      createdBy: uids['admin@pbstats.test'],
    });
  }

  console.log(`Seeded ${USERS.length} logins, ${ids.length} players, 2 groups, ${games.length} games into the emulator.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
