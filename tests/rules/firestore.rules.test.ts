import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

const CLUB = 'N2M9BCBuEdE1JKbC93IK';
let env: RulesTestEnvironment;

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-pbstats-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin'), { uid: 'admin', role: 'admin', clubMemberships: [CLUB] });
    await setDoc(doc(db, 'users/member'), { uid: 'member', role: 'player', clubMemberships: [CLUB] });
    await setDoc(doc(db, 'users/viewer'), { uid: 'viewer', role: 'viewer', clubMemberships: [CLUB] });
    await setDoc(doc(db, 'users/legacyadmin'), { uid: 'legacyadmin', role: 'player', clubMemberships: [CLUB], clubRoles: { [CLUB]: 'club_admin' } });
    await setDoc(doc(db, 'users/outsider'), { uid: 'outsider', role: 'player', clubMemberships: ['other-club'] });
    await setDoc(doc(db, 'players/p1'), { name: 'P1', clubId: CLUB, rating: 3, wins: 0, losses: 0, avatar: '' });
    await setDoc(doc(db, 'games/g1'), { clubId: CLUB, playerIds: ['p1'] });
    await setDoc(doc(db, 'tournaments/t1'), { clubId: CLUB, isQuickPlay: true, status: 'active' });
    await setDoc(doc(db, 'tournamentMatches/open'), { tournamentId: 't1', status: 'pending' });
    await setDoc(doc(db, 'tournamentMatches/done'), { tournamentId: 't1', status: 'completed', gameId: 'g1' });
    await setDoc(doc(db, 'events/e1'), { clubId: CLUB, title: 'Training', rsvpCounts: { yes: 0, maybe: 0, no: 0 } });
    await setDoc(doc(db, 'friendlies/f1'), { clubId: CLUB, createdBy: 'admin', matches: [] });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

describe('reading', () => {
  it('members can read club data; signed-out users and outsiders cannot', async () => {
    await assertSucceeds(getDoc(doc(as('member'), 'players/p1')));
    await assertSucceeds(getDocs(query(collection(as('member'), 'games'), where('clubId', '==', CLUB))));
    await assertFails(getDoc(doc(as(null), 'players/p1')));
    await assertFails(getDoc(doc(as('outsider'), 'games/g1')));
    await assertFails(getDoc(doc(as('nobody'), 'players/p1')));
  });
});

describe('ratings are server-only', () => {
  it('nobody can write games from the browser, not even admins', async () => {
    await assertFails(setDoc(doc(as('member'), 'games/new'), { clubId: CLUB }));
    await assertFails(setDoc(doc(as('admin'), 'games/new'), { clubId: CLUB }));
    await assertFails(deleteDoc(doc(as('admin'), 'games/g1')));
  });

  it('player stats cannot be changed from the browser', async () => {
    await assertFails(updateDoc(doc(as('member'), 'players/p1'), { rating: 8 }));
    await assertFails(updateDoc(doc(as('admin'), 'players/p1'), { wins: 99 }));
    await assertFails(setDoc(doc(as('admin'), 'players/new'), { name: 'X', clubId: CLUB, rating: 3 }));
  });

  it('members can change a photo; admins can edit profile fields', async () => {
    await assertSucceeds(updateDoc(doc(as('member'), 'players/p1'), { avatar: 'https://x/y.png' }));
    await assertFails(updateDoc(doc(as('member'), 'players/p1'), { name: 'Renamed' }));
    await assertSucceeds(updateDoc(doc(as('admin'), 'players/p1'), { name: 'Renamed', gender: 'she' }));
    await assertSucceeds(updateDoc(doc(as('legacyadmin'), 'players/p1'), { duprId: 'ABC' }));
  });
});

describe('sessions', () => {
  it('members create sessions in the club; viewers cannot', async () => {
    await assertSucceeds(setDoc(doc(as('member'), 'tournaments/t2'), { clubId: CLUB, isQuickPlay: true }));
    await assertFails(setDoc(doc(as('member'), 'tournaments/t3'), { clubId: 'other-club' }));
    await assertFails(setDoc(doc(as('viewer'), 'tournaments/t4'), { clubId: CLUB }));
  });

  it('only matches without a result can be deleted or edited from the browser', async () => {
    await assertSucceeds(deleteDoc(doc(as('member'), 'tournamentMatches/open')));
    await assertFails(deleteDoc(doc(as('member'), 'tournamentMatches/done')));
    await assertFails(updateDoc(doc(as('member'), 'tournamentMatches/done'), { status: 'pending' }));
  });

  it('a match cannot be marked completed from the browser', async () => {
    await assertFails(updateDoc(doc(as('member'), 'tournamentMatches/open'), { status: 'completed', gameId: 'fake' }));
  });

  it('tournaments can only be deleted by the server (it reverses ratings)', async () => {
    await assertFails(deleteDoc(doc(as('admin'), 'tournaments/t1')));
  });
});

describe('users and sign-up', () => {
  it('a new user can create only a plain player profile in the club', async () => {
    await assertSucceeds(
      setDoc(doc(as('newbie'), 'users/newbie'), { uid: 'newbie', role: 'player', clubMemberships: [CLUB], name: 'N' })
    );
    await assertFails(setDoc(doc(as('sneaky'), 'users/sneaky'), { uid: 'sneaky', role: 'admin', clubMemberships: [CLUB] }));
    await assertFails(
      setDoc(doc(as('sneaky2'), 'users/sneaky2'), { uid: 'sneaky2', role: 'player', clubMemberships: [CLUB], clubRoles: { [CLUB]: 'club_admin' } })
    );
  });

  it("members can't promote themselves", async () => {
    await assertFails(updateDoc(doc(as('member'), 'users/member'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(as('member'), 'users/member'), { name: 'New name' }));
    await assertSucceeds(updateDoc(doc(as('admin'), 'users/member'), { role: 'viewer' }));
  });
});

describe('events', () => {
  it('only admins manage events; members can RSVP', async () => {
    await assertFails(updateDoc(doc(as('member'), 'events/e1'), { title: 'Hacked' }));
    await assertSucceeds(updateDoc(doc(as('member'), 'events/e1'), { rsvpCounts: { yes: 1, maybe: 0, no: 0 } }));
    await assertSucceeds(updateDoc(doc(as('admin'), 'events/e1'), { title: 'Training (moved)' }));
    await assertSucceeds(
      setDoc(doc(as('member'), 'eventRsvps/e1_member'), { eventId: 'e1', userId: 'member', clubId: CLUB, response: 'yes' })
    );
    await assertFails(
      setDoc(doc(as('member'), 'eventRsvps/e1_admin'), { eventId: 'e1', userId: 'admin', clubId: CLUB, response: 'no' })
    );
  });
});

describe('friendlies', () => {
  it('members create and update friendlies; only admins or the creator delete', async () => {
    await assertSucceeds(setDoc(doc(as('member'), 'friendlies/f2'), { clubId: CLUB, createdBy: 'member', matches: [] }));
    await assertSucceeds(updateDoc(doc(as('member'), 'friendlies/f1'), { status: 'live' }));
    await assertFails(deleteDoc(doc(as('member'), 'friendlies/f1')));
    await assertSucceeds(deleteDoc(doc(as('member'), 'friendlies/f2')));
    await assertSucceeds(deleteDoc(doc(as('admin'), 'friendlies/f1')));
  });
});
