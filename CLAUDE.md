# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PBstats is a pickleball statistics tracking application built with Next.js 14, Firebase, and TypeScript, used by a single club (DLWest). It tracks player performance, game results, quick-play sessions, tournaments, box leagues and ELO-based rankings, with players organised into groups (stored as "circles").

The app previously supported multiple clubs; that was rolled back. Every stored document still has a `clubId` field (kept so existing data and Firestore indexes stay valid) — always set it to `CLUB_ID` from `src/config/club.ts`.

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

**Single club**: `src/config/club.ts` exports `CLUB` / `CLUB_ID`. `useClub()` in `src/contexts/club-context.tsx` is a compatibility shim that always returns that club; prefer importing `CLUB_ID` in new code.

**Circles System**: Within each club, players can be organized into "circles" - groups of players (like leagues or skill levels). Data is filtered by both club and circle context throughout the application.

**Context Providers**:
- `AuthContext` - User authentication and role-based permissions
- `CircleContext` - Circle selection and filtering logic (within a club)

**Data Layer**:
- All Firebase operations centralized in `/src/lib/` files
- Type definitions in `/src/lib/types.ts` define core entities: Club, Player, Game, Tournament, Circle, BoxLeague
- All entities include `clubId` (always `CLUB_ID`)
- Rating system uses ELO algorithm with rating history tracking
- Composite Firestore indexes for efficient club-filtered queries

### File Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - Reusable React components and UI primitives
- `/src/lib/` - Firebase operations, utilities, and business logic
- `/src/contexts/` - React context providers (AuthContext, ClubContext, CircleContext)
- `/src/hooks/` - Custom React hooks (use-clubs.ts, use-players.ts, etc.)
- `/docs/` - Documentation
- `/scripts/` - Migration and utility scripts
- `/firestore.rules` - Firestore Security Rules with club-based access control

### Key Features
- **Player Management**: Add/manage players with avatars and stats (per club)
- **Game Logging**: Record singles/doubles games with automatic rating updates
- **Tournaments**: Round-robin, single/double elimination formats
- **Box Leagues**: Structured league system with automated matchmaking
- **Circles**: Player groupings within clubs for organized play
- **Statistics**: Win/loss records, head-to-head, partnership tracking
- **PWA Support**: Service worker for offline capabilities

### Authentication & Permissions
- Firebase Auth. Signed-out users are redirected to `/login` by `AppLayout`.
- **Roles**: admin (full access), player (default for new sign-ups), viewer (read-only)
- `isAdminUser()` in `src/lib/permissions.ts` also treats legacy club admins (`role: 'club_admin'` or `clubRoles[CLUB_ID] === 'club_admin'`) as admins
- New registrations join the club automatically (`clubMemberships: [CLUB_ID]`), and the admin is emailed

### Development Notes
- Uses React Query for server state management
- Mobile-first responsive design
- Offline-capable PWA with service worker
- AI integration via Genkit for potential future features
- TypeScript strict mode enabled

## Known issues
- `next.config.js` sets `ignoreBuildErrors` / `ignoreDuringBuilds`; there are pre-existing type errors, so run `npm run typecheck` and don't add new ones.
- `npm run lint` is broken (ESLint 9 with Next 14 config).
