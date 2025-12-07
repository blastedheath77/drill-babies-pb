# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PBstats is a pickleball statistics tracking application built with Next.js 14, Firebase, and TypeScript. The app supports multiple independent clubs, each tracking player performance, game results, tournaments, and ELO-based rankings within player circles (groups). The multi-club architecture enables complete data isolation between clubs while sharing the same infrastructure.

## Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build production bundle (runs service worker generation pre/post build)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run typecheck` - Run TypeScript compiler without emitting files
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run genkit:dev` - Start Genkit AI development server
- `npm run genkit:watch` - Start Genkit AI in watch mode

## Architecture

### Core Technologies
- **Next.js 14** with App Router
- **Firebase** (Firestore, Auth, Storage)
- **TypeScript** for type safety
- **Tailwind CSS** with shadcn/ui components
- **React Query** (@tanstack/react-query) for data fetching
- **Genkit AI** for AI features

### Key Architectural Patterns

**Multi-Club Architecture**: The app supports multiple independent clubs with complete data isolation:
- Each club has its own players, games, tournaments, circles, and box leagues
- All entities include a `clubId` field for filtering and access control
- Users can belong to multiple clubs with different roles per club
- Club selection is managed globally via `ClubContext`
- Firestore Security Rules enforce club-based access control at the database level

**Circles System**: Within each club, players can be organized into "circles" - groups of players (like leagues or skill levels). Data is filtered by both club and circle context throughout the application.

**Context Providers**:
- `AuthContext` - User authentication and role-based permissions
- `ClubContext` - Club selection and multi-club state management
- `CircleContext` - Circle selection and filtering logic (within a club)

**Data Layer**:
- All Firebase operations centralized in `/src/lib/` files
- Type definitions in `/src/lib/types.ts` define core entities: Club, Player, Game, Tournament, Circle, BoxLeague
- All entities include `clubId` for data isolation
- Rating system uses ELO algorithm with rating history tracking
- Composite Firestore indexes for efficient club-filtered queries

### File Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - Reusable React components and UI primitives
- `/src/lib/` - Firebase operations, utilities, and business logic
- `/src/contexts/` - React context providers (AuthContext, ClubContext, CircleContext)
- `/src/hooks/` - Custom React hooks (use-clubs.ts, use-players.ts, etc.)
- `/docs/` - Documentation (CLUB_ARCHITECTURE.md, ADMIN_GUIDE.md)
- `/scripts/` - Migration and utility scripts
- `/firestore.rules` - Firestore Security Rules with club-based access control

### Key Features
- **Multi-Club Support**: Multiple independent clubs with complete data isolation
- **Club Management**: Create/edit/delete clubs, manage members and roles (admin only)
- **Player Management**: Add/manage players with avatars and stats (per club)
- **Game Logging**: Record singles/doubles games with automatic rating updates
- **Tournaments**: Round-robin, single/double elimination formats
- **Box Leagues**: Structured league system with automated matchmaking
- **Circles**: Player groupings within clubs for organized play
- **Statistics**: Win/loss records, head-to-head, partnership tracking
- **PWA Support**: Service worker for offline capabilities

### Authentication & Permissions
- Firebase Auth with fallback to localStorage for development
- **Global Roles**: admin (full access), player, viewer (read-only)
- **Club Roles**: club_admin (full access to their club), member (default)
- **Access Control**: Database-level enforcement via Firestore Security Rules
- **Multi-Club Membership**: Users can belong to multiple clubs with different roles per club

### Development Notes
- Uses React Query for server state management
- Mobile-first responsive design
- Offline-capable PWA with service worker
- AI integration via Genkit for potential future features
- TypeScript strict mode enabled

## Working with Multi-Club Architecture

### Important Patterns

**Always include clubId in queries:**
```typescript
// Good
const { data: players } = usePlayers(); // Hook automatically uses selectedClub.id

// In database operations
const players = await getPlayersByClubId(clubId);
```

**Always validate club selection in create forms:**
```typescript
const { selectedClub } = useClub();

if (!selectedClub?.id) {
  toast({ title: 'No club selected' });
  return;
}

await createPlayer({ ...data, clubId: selectedClub.id });
```

**React Query keys must include clubId:**
```typescript
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (clubId?: string) => [...playerKeys.lists(), clubId] as const,
};
```

### Testing Club Features

1. Test with club selected (normal flow)
2. Test without club selected (should show validation)
3. Test switching between clubs (data should update)
4. Test as different user roles (admin, club_admin, member)

### Common Issues

- **"Missing or insufficient permissions"**: Check Firestore Security Rules and user's clubMemberships
- **Data not showing**: Verify clubId exists on entities and user has club access
- **Cannot create entity**: Ensure club is selected and clubId is included in mutation data

### Key Files for Multi-Club Development

- `/src/contexts/club-context.tsx` - Club state management
- `/src/hooks/use-clubs.ts` - Club operations hooks
- `/src/components/club-selector.tsx` - Club switching UI
- `/firestore.rules` - Security rules (be careful when modifying)
- `/docs/CLUB_ARCHITECTURE.md` - Detailed architecture documentation
- `/docs/ADMIN_GUIDE.md` - Admin operations guide