# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PBstats is a pickleball statistics tracking application built with Next.js 14, Firebase, and TypeScript. The app tracks player performance, game results, tournaments, and provides ELO-based rankings within player circles (groups/clubs).

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

**Circles System**: The app is built around "circles" - groups of players (like clubs or leagues). Data is filtered by circle context throughout the application.

**Context Providers**:
- `AuthContext` - User authentication and role-based permissions
- `CircleContext` - Circle selection and filtering logic

**Data Layer**:
- All Firebase operations centralized in `/src/lib/` files
- Type definitions in `/src/lib/types.ts` define core entities: Player, Game, Tournament, Circle
- Rating system uses ELO algorithm with rating history tracking

### File Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - Reusable React components and UI primitives
- `/src/lib/` - Firebase operations, utilities, and business logic  
- `/src/contexts/` - React context providers
- `/src/hooks/` - Custom React hooks

### Key Features
- **Player Management**: Add/manage players with avatars and stats
- **Game Logging**: Record singles/doubles games with automatic rating updates
- **Tournaments**: Round-robin, single/double elimination formats
- **Statistics**: Win/loss records, head-to-head, partnership tracking
- **PWA Support**: Service worker for offline capabilities

### Authentication & Permissions
- Firebase Auth with fallback to localStorage for development
- Role-based permissions: admin, player, viewer
- Circle-based access control

### Development Notes
- Uses React Query for server state management
- Mobile-first responsive design
- Offline-capable PWA with service worker
- AI integration via Genkit for potential future features
- TypeScript strict mode enabled