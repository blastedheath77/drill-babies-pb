# Multi-Club Architecture Documentation

## Overview

PBstats has been enhanced with multi-club support, allowing a single Firebase instance to serve multiple independent pickleball clubs. Each club maintains complete data isolation while sharing the same codebase and infrastructure.

## Core Concepts

### Club Isolation

Every data entity in the system (players, games, tournaments, circles, box leagues) belongs to exactly one club, identified by a `clubId` field. This ensures:

- Users only see data from clubs they belong to
- Data cannot leak between clubs
- Each club operates independently
- Club-specific statistics and rankings

### Club Membership

Users can belong to multiple clubs through the `clubMemberships` array in their user document:

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'player' | 'viewer';
  clubMemberships: string[];  // Array of clubIds
  clubRoles: {                // Role per club
    [clubId: string]: 'club_admin' | 'member';
  };
}
```

### Role Hierarchy

1. **Global Admin** (`role: 'admin'`)
   - Full access to all data across all clubs
   - Can create and manage clubs
   - Can assign club memberships and roles

2. **Club Admin** (`clubRoles[clubId]: 'club_admin'`)
   - Full access to their specific club's data
   - Can manage players, games, tournaments within their club
   - Cannot access other clubs' data

3. **Member** (user in `clubMemberships` array)
   - Read and write access to their club's data
   - Can create games, players, tournaments in their clubs

4. **Viewer** (`role: 'viewer'`)
   - Read-only access to their clubs' data

## Data Model

### Club Document

```typescript
interface Club {
  id: string;
  name: string;              // e.g., "DLWest Pickleball"
  description?: string;      // Club description
  isActive: boolean;         // Soft delete flag
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings?: {
    allowMemberInvites?: boolean;
    requireApproval?: boolean;
  };
}
```

### Entity Structure

All entities (players, games, tournaments, circles, boxLeagues) include:

```typescript
{
  id: string;
  clubId: string;           // REQUIRED: Club this entity belongs to
  createdBy: string;        // User ID who created it
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // ... entity-specific fields
}
```

## Client-Side Architecture

### Club Context

The `ClubContext` provides club selection state throughout the application:

```typescript
// src/contexts/club-context.tsx
interface ClubContextType {
  selectedClub: Club | null;
  setSelectedClub: (club: Club | null) => void;
  isLoading: boolean;
}

// Usage in components:
const { selectedClub } = useClub();
```

**Key Locations:**
- Context provider: `/src/contexts/club-context.tsx`
- Hook: `useClub()` for accessing selected club
- Selector: `/src/components/club-selector.tsx` in the navbar

### Data Filtering

All queries automatically filter by `clubId`:

```typescript
// src/hooks/use-players.ts
export function usePlayers() {
  const { selectedClub } = useClub();

  return useQuery({
    queryKey: ['players', selectedClub?.id],
    queryFn: () => getPlayersByClubId(selectedClub!.id),
    enabled: !!selectedClub?.id,
  });
}
```

**Pattern Applied To:**
- Players: `/src/hooks/use-players.ts`
- Games: `/src/hooks/use-games.ts`
- Tournaments: `/src/hooks/use-tournaments.ts`
- Circles: `/src/hooks/use-circles.ts`
- Box Leagues: `/src/hooks/use-box-leagues.ts`

### Form Validation

All create forms validate club selection before submission:

```typescript
// Example from circle-form-dialog.tsx
const onSubmit = async (data: FormData) => {
  if (!selectedClub?.id) {
    toast({
      variant: 'destructive',
      title: 'No Club Selected',
      description: 'Please select a club before creating.',
    });
    return;
  }

  await createMutation.mutateAsync({
    ...data,
    clubId: selectedClub.id,
  });
};
```

## Server-Side Architecture

### Firestore Queries

All database queries filter by `clubId`:

```typescript
// src/lib/players.ts
export async function getPlayersByClubId(clubId: string): Promise<Player[]> {
  const q = query(
    playersCollection,
    where('clubId', '==', clubId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Composite Indexes

Firestore requires composite indexes for multi-field queries:

```
Collection: games
Fields: clubId (Ascending), createdAt (Descending)

Collection: players
Fields: clubId (Ascending), name (Ascending)

Collection: tournaments
Fields: clubId (Ascending), startDate (Descending)
```

**Index Management:**
- Firestore Console: https://console.firebase.google.com/project/pbstats-claude/firestore/indexes
- Auto-created on first query (follow console link in error message)

### Security Rules

Database-level security enforced via Firestore Security Rules:

```javascript
// firestore.rules - Key patterns

// Users can only access data from their clubs
function hasClubAccess(clubId) {
  return isAuthenticated() &&
    clubId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.clubMemberships;
}

// Players collection example
match /players/{playerId} {
  allow read: if hasClubAccess(resource.data.clubId);
  allow create: if hasClubAccess(request.resource.data.clubId);
  allow update: if hasClubAccess(resource.data.clubId) && clubIdUnchanged();
}
```

**Security Guarantees:**
- Club members can only read/write their club's data
- clubId cannot be changed after creation
- Global admins bypass club restrictions
- All operations require authentication

## UI Components

### Club Selector

Location: `/src/components/club-selector.tsx`

Displays in the navbar, allows users to switch between clubs they belong to:

```typescript
<ClubSelector
  clubs={userClubs}
  selectedClub={selectedClub}
  onSelectClub={setSelectedClub}
/>
```

### Club Badge

Shows current club context in headers/pages:

```typescript
{selectedClub && (
  <Badge variant="outline">{selectedClub.name}</Badge>
)}
```

### Club Management

Location: `/src/app/clubs/clubs-client.tsx`

Admin interface for managing clubs:
- Create new clubs (global admins only)
- Edit club details (club admins + global admins)
- Delete clubs - soft delete via `isActive: false`
- View member count per club
- Search and filter clubs

## Migration Strategy

### Phase 1-3: Foundation
- Added `clubId` to TypeScript types
- Updated all database operations
- Modified React Query hooks

### Phase 4: UI Components
- Club selector in navbar
- Club context provider
- Updated all create forms
- Club management interface

### Phase 5: Data Migration
- Created migration scripts for existing data
- Assigned all legacy data to default club (DLWest)
- Verified 100% migration success

### Phase 6: Security
- Implemented comprehensive Firestore rules
- Role-based access control
- Club-level data isolation

### Phase 7: Production Deployment
- Deployed security rules to production
- Zero downtime migration
- Verified all systems operational

## Common Patterns

### Creating Entities

```typescript
// 1. Get selected club from context
const { selectedClub } = useClub();

// 2. Validate club selection
if (!selectedClub?.id) {
  toast({ title: 'No club selected' });
  return;
}

// 3. Include clubId in mutation
await createMutation.mutateAsync({
  ...formData,
  clubId: selectedClub.id,
  createdBy: user.id,
});
```

### Querying Entities

```typescript
// 1. Get selected club
const { selectedClub } = useClub();

// 2. Query hook automatically filters
const { data: players } = usePlayers(); // Filtered by selectedClub.id

// 3. Server-side query includes clubId filter
const q = query(collection, where('clubId', '==', clubId));
```

### Switching Clubs

```typescript
// User selects different club in ClubSelector
setSelectedClub(newClub);

// React Query automatically refetches all queries with new clubId
// All data updates to show new club's data
```

## Testing

### Manual Testing Checklist

1. **Club Selection**
   - Switch between clubs in selector
   - Verify data updates immediately
   - Check persistence across page refreshes

2. **Data Isolation**
   - Create player in Club A
   - Switch to Club B
   - Verify player not visible in Club B

3. **Create Operations**
   - Create entities without selecting club (should show error)
   - Create entities with club selected (should succeed with clubId)

4. **Permissions**
   - Test as global admin (see all clubs)
   - Test as club admin (see only their club)
   - Test as member (read/write in their clubs)

### Migration Verification

```bash
# Run verification script
npx tsx scripts/verify-club-migrations.ts

# Expected output:
# ✅ players: 100%
# ✅ games: 100%
# ✅ tournaments: 100%
# ✅ circles: 100%
# ✅ boxLeagues: 100%
```

## Troubleshooting

### "Missing or insufficient permissions" Error

**Cause**: Firestore security rules blocking access

**Solution**:
1. Check user is authenticated: `firebase auth list`
2. Verify user has club membership: Check users/{userId}.clubMemberships
3. Confirm clubId exists on entity
4. Review firestore.rules for the specific collection

### Data Not Showing After Club Selection

**Cause**: React Query cache or missing clubId

**Solution**:
1. Check browser console for query errors
2. Verify selectedClub is set: `console.log(selectedClub)`
3. Check Firestore console for data with clubId
4. Clear React Query cache: `queryClient.clear()`

### Cannot Create Entity

**Cause**: Missing club selection or validation

**Solution**:
1. Ensure club is selected before form submission
2. Check form includes clubId in mutation data
3. Verify user has hasClubAccess() permission
4. Review firestore.rules create permission

## Performance Considerations

### Query Optimization

- **Composite Indexes**: Created for all clubId + orderBy queries
- **Query Enablement**: Queries disabled when no club selected
- **React Query Caching**: Reduces redundant fetches

### Security Rule Reads

Each security rule that uses `get()` counts as a Firestore read:

```javascript
// This rule uses 1 read per operation
function hasClubAccess(clubId) {
  return clubId in get(/databases/.../users/$(request.auth.uid)).data.clubMemberships;
}
```

**Optimization**: User document is cached by Firebase, so multiple operations in quick succession use cached data.

## Future Enhancements

### Potential Features

1. **Club Invitations**
   - Email-based club invites
   - Pending membership requests
   - Approval workflow for club admins

2. **Inter-Club Features**
   - Cross-club tournaments
   - Shared player rankings (opt-in)
   - Club vs club matches

3. **Club Analytics**
   - Club activity dashboard
   - Member engagement metrics
   - Growth tracking

4. **Club Customization**
   - Custom branding per club
   - Club-specific settings
   - Custom ELO parameters

## References

- **Firestore Security Rules**: `/firestore.rules`
- **Migration Scripts**: `/scripts/`
- **Type Definitions**: `/src/lib/types.ts`
- **Club Operations**: `/src/lib/clubs.ts`
- **Implementation TODO**: `/MULTI_CLUB_TODO.md`
