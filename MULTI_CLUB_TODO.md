# Multi-Club Support Implementation - TODO List

## Status Overview

**Started:** Phase 1
**Current Phase:** Phase 4 (Partially Complete)
**Completion:** ~50%

---

## ✅ Completed Phases

### Phase 1: Data Models & Types ✓
- [x] Added `Club` interface to `/src/lib/types.ts`
- [x] Added `clubId` field to all entities (Player, Game, Tournament, Circle, BoxLeague)
- [x] Updated `User` type with `clubMemberships`, `selectedClubId`, and `clubRoles`
- [x] Added `club_admin` role to `UserRole` type
- [x] Updated permissions in `/src/lib/permissions.ts`
- [x] Created `/src/lib/clubs.ts` with club CRUD operations

### Phase 2: Context & State Management ✓
- [x] Created `/src/contexts/club-context.tsx` with ClubContext provider
- [x] Created `/src/hooks/use-clubs.ts` with React Query hooks
- [x] Integrated `ClubProvider` into `/src/app/layout.tsx`
- [x] Implemented club selection persistence

### Phase 3: Database Query Updates ✓
- [x] Updated player queries in `/src/lib/data.ts` (getPlayers, etc.)
- [x] Updated circle queries in `/src/lib/circles.ts`
- [x] Updated game queries (getRecentGames, getAllGames, getGamesForPlayer, getTotalGamesCount)
- [x] Updated tournament queries (getTournaments, getTournamentsByStatus)
- [x] Updated BoxLeague queries (getBoxLeagues)
- [x] Updated all React Query hooks to include clubId in query keys
- [x] Created Firestore composite indexes in `firestore.indexes.json`

### Phase 4: UI Components (Partial) ✓
- [x] Created `ClubSelector` component (`/src/components/club-selector.tsx`)
- [x] Integrated ClubSelector into desktop sidebar
- [x] Integrated ClubSelector into mobile navigation

---

## 📋 Phase 4: UI Components (Remaining)

### 1. Create Club Management Page
**File:** `/src/app/clubs/page.tsx`

- [ ] Create clubs list page (admin only)
- [ ] Display all clubs with name, description, member count
- [ ] Add "Create Club" button (opens dialog/form)
- [ ] Implement club creation form
- [ ] Add edit/delete actions for each club
- [ ] Add search/filter functionality

**File:** `/src/app/clubs/clubs-client.tsx`
- [ ] Create client component for clubs list
- [ ] Use `useClubs()` hook to fetch data
- [ ] Implement club card/table layout
- [ ] Add loading and error states

### 2. Create Club Settings Page
**File:** `/src/app/clubs/[id]/settings/page.tsx`

- [ ] Create club settings page
- [ ] Display club information (name, description, created date)
- [ ] Edit club details form
- [ ] Display club members list
- [ ] Add/remove members interface
- [ ] Assign club admin roles
- [ ] Club-specific settings (default player rating, public join, etc.)

**File:** `/src/app/clubs/[id]/settings/settings-client.tsx`
- [ ] Create client component for settings
- [ ] Use `useClub(id)` and `useUpdateClub()` hooks
- [ ] Implement member management UI
- [ ] Add role assignment controls

### 3. Update Existing Pages to Use Selected Club

#### Players Page
**File:** `/src/app/players/page.tsx`
- [ ] Import `useClub` hook
- [ ] Pass `selectedClub?.id` to `usePlayers()` hook
- [ ] Update page title to show club context
- [ ] Handle no club selected state

**File:** `/src/app/players/players-client.tsx`
- [ ] Update to use clubId from props
- [ ] Ensure player list filters by club

#### Games Page
**File:** `/src/app/games/page.tsx`
- [ ] Import `useClub` hook
- [ ] Pass `selectedClub?.id` to `useAllGames()` hook
- [ ] Update page title with club context

**File:** `/src/app/games/games-client.tsx`
- [ ] Update to use clubId from props
- [ ] Ensure games list filters by club

#### Tournaments Page
**File:** `/src/app/tournaments/page.tsx`
- [ ] Import `useClub` hook
- [ ] Pass `selectedClub?.id` to `useAllTournaments()` hook
- [ ] Update page title with club context

**File:** `/src/app/tournaments/tournaments-client.tsx`
- [ ] Update to use clubId from props
- [ ] Ensure tournaments filter by club

#### Circles Page
**File:** `/src/app/circles/page.tsx`
- [ ] Import `useClub` hook
- [ ] Pass `selectedClub?.id` to `useCircles()` hook
- [ ] Update page title with club context

**File:** `/src/app/circles/circles-client.tsx`
- [ ] Update to use clubId from props
- [ ] Ensure circles filter by club

#### Statistics Page
**File:** `/src/app/statistics/page.tsx`
- [ ] Import `useClub` hook
- [ ] Scope all statistics to selected club
- [ ] Update queries to include clubId

#### Dashboard/Home Page
**File:** `/src/app/page.tsx`
- [ ] Update to use selected club context
- [ ] Show club-specific stats and recent activity

### 4. Update Create Forms to Include ClubId

#### Create Player Form
**File:** `/src/app/players/create/create-player-client.tsx`
- [ ] Get `selectedClub?.id` from context
- [ ] Include clubId in player creation data
- [ ] Show current club name in form

#### Log Game Form
**File:** `/src/app/log-game/log-game-client-page.tsx`
- [ ] Get `selectedClub?.id` from context
- [ ] Include clubId in game creation data
- [ ] Filter player selection by club

#### Create Tournament Form
**File:** `/src/app/tournaments/create/create-tournament-form.tsx`
- [ ] Get `selectedClub?.id` from context
- [ ] Include clubId in tournament creation data
- [ ] Filter player selection by club

#### Create Circle Form
**File:** `/src/app/circles/create/create-circle-client.tsx`
- [ ] Get `selectedClub?.id` from context
- [ ] Include clubId in circle creation data
- [ ] Show current club context

#### Create Box League Form
**File:** `/src/app/box-leagues/create/create-box-league-client.tsx`
- [ ] Get `selectedClub?.id` from context
- [ ] Include clubId in box league creation data
- [ ] Filter circle and player selection by club

### 5. Add Club Admin UI Elements

**Component:** User Invitation System
- [ ] Create invite dialog component
- [ ] Implement email invitation flow
- [ ] Generate invitation tokens/links
- [ ] Handle invitation acceptance

**Component:** Member Management
- [ ] Create member list component
- [ ] Add role assignment interface
- [ ] Implement remove member functionality
- [ ] Show member activity/stats

---

## 📋 Phase 5: Migration Script & Testing

### 1. Create Migration Script
**File:** `/scripts/migrate-to-clubs.ts`

- [ ] Create script to add clubId to all existing data
- [ ] Create default "DLWest" club
- [ ] Assign all existing players to DLWest
- [ ] Assign all existing games to DLWest
- [ ] Assign all existing tournaments to DLWest
- [ ] Assign all existing circles to DLWest
- [ ] Assign all existing box leagues to DLWest
- [ ] Update all user accounts with DLWest membership
- [ ] Set DLWest as selectedClubId for all users
- [ ] Add logging and progress tracking
- [ ] Add rollback capability

### 2. Testing
- [ ] Test migration script on development database
- [ ] Verify all data has clubId field
- [ ] Test club switching functionality
- [ ] Test data isolation (users only see their club's data)
- [ ] Test permissions (global admin vs club admin)
- [ ] Test creating new clubs
- [ ] Test adding members to clubs
- [ ] Test removing members from clubs
- [ ] Test all CRUD operations with club filtering
- [ ] Test multi-club scenarios (user in multiple clubs)
- [ ] Test single-club scenarios
- [ ] Test UI with no clubs
- [ ] Verify all indexes are working

---

## 📋 Phase 6: Firestore Security Rules

### Update Security Rules
**File:** `firestore.rules`

- [ ] Add club-based access rules
- [ ] Ensure users can only read their clubs' data
- [ ] Ensure users can only write to their clubs' data
- [ ] Enforce club admin permissions for club management
- [ ] Enforce global admin permissions for creating clubs
- [ ] Add rules for club membership validation
- [ ] Add rules for invite system
- [ ] Test all security rules thoroughly
- [ ] Document security model

Example rules structure:
```javascript
// Players collection
match /players/{playerId} {
  allow read: if isAuthenticated() && hasClubAccess(resource.data.clubId);
  allow create: if isAuthenticated() && hasClubAccess(request.resource.data.clubId);
  allow update: if isAuthenticated() && hasClubAccess(resource.data.clubId);
  allow delete: if isAdmin() || isClubAdmin(resource.data.clubId);
}

// Clubs collection
match /clubs/{clubId} {
  allow read: if isAuthenticated() && hasClubAccess(clubId);
  allow create: if isAdmin();
  allow update: if isAdmin() || isClubAdmin(clubId);
  allow delete: if isAdmin();
}
```

---

## 📋 Phase 7: Production Migration

### Pre-Migration
- [ ] Create full backup of production Firestore database
- [ ] Test migration script on backup copy
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window
- [ ] Notify users of upcoming changes

### Migration
- [ ] Deploy Firestore indexes to production
- [ ] Wait for indexes to build
- [ ] Run migration script on production
- [ ] Verify all data migrated correctly
- [ ] Deploy new application code
- [ ] Deploy updated security rules

### Post-Migration
- [ ] Monitor application for errors
- [ ] Verify club filtering works correctly
- [ ] Check that all users have club access
- [ ] Monitor performance metrics
- [ ] Gather user feedback

---

## 📋 Phase 8: Documentation & Cleanup

### Documentation
- [ ] Document club hierarchy architecture
- [ ] Create admin guide for managing clubs
- [ ] Create user guide for club selection
- [ ] Document club permissions model
- [ ] Update API documentation
- [ ] Add code comments for club-related logic

**File:** `docs/CLUB_ARCHITECTURE.md`
- [ ] Explain Club → Circles → Players hierarchy
- [ ] Document data model
- [ ] Explain permissions system
- [ ] Provide examples

**File:** `docs/ADMIN_GUIDE.md`
- [ ] How to create clubs
- [ ] How to manage members
- [ ] How to assign club admins
- [ ] How to handle user requests

### Cleanup
- [ ] Remove any temporary migration code
- [ ] Remove debug logging
- [ ] Optimize queries if needed
- [ ] Final code review
- [ ] Update package dependencies if needed

### Final Testing
- [ ] Full regression testing
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing

---

## Implementation Notes

### Key Patterns Used

**Optional clubId Pattern:**
```typescript
function getData(clubId?: string) {
  const q = clubId
    ? query(collection, where('clubId', '==', clubId), orderBy('field'))
    : query(collection, orderBy('field'));
}
```

**React Query Keys:**
```typescript
export const dataKeys = {
  all: ['data'] as const,
  list: (clubId?: string) => [...dataKeys.all, 'list', clubId] as const,
};
```

**Using Selected Club:**
```typescript
const { selectedClub } = useClub();
const { data } = useData(selectedClub?.id);
```

### Important Considerations

1. **Backward Compatibility:** All queries work with or without clubId during migration
2. **Performance:** Composite indexes ensure efficient filtering
3. **User Experience:** ClubSelector only shows when needed (multiple clubs)
4. **Security:** Multi-layered approach (client-side, server-side, Firestore rules)
5. **Data Isolation:** Complete separation between clubs
6. **Flexibility:** Users can belong to multiple clubs

---

## Current Status

**Last Updated:** 2025-12-03
**Current Phase:** Phase 4 - UI Components (50% complete)
**Next Task:** Create club management page
**Estimated Completion:** Phase 4 remaining tasks + Phases 5-8

---

## Quick Reference

**Key Files Modified:**
- `/src/lib/types.ts` - Data models
- `/src/lib/clubs.ts` - Club operations
- `/src/contexts/club-context.tsx` - Club state
- `/src/components/club-selector.tsx` - Club switcher
- `/firestore.indexes.json` - Database indexes

**Key Patterns:**
- All entities have `clubId` field
- All queries accept optional `clubId` parameter
- All React Query hooks include `clubId` in keys
- ClubContext provides selected club globally
