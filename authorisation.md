# Authentication & Authorization Enhancement Plan
## Phantom Players & Circle Invitations Implementation

This document outlines the comprehensive plan to implement phantom players (pre-existing player profiles) and enhanced circle invitation system for PBstats.

---

## Phase 1: Database & Core Infrastructure

### 1. Database Schema Updates
- [ ] **Analyze current Player type and database schema**
- [ ] **Design enhanced Player interface with phantom/claiming fields**
  - Add `claimedByUserId?: string`
  - Add `email?: string` 
  - Add `isPhantom?: boolean`
  - Add `createdBy?: string`
  - Add `claimedAt?: string`
- [ ] **Create database migration strategy for existing players**
  - Script to set `isPhantom: false` for all existing players
  - Determine which existing players should be linked to users

---

## Phase 2: Core Phantom Player System

### 2. Player Creation & Management
- [ ] **Implement phantom player creation functions**
  - `createPhantomPlayer(name, email?, createdBy)`
  - `createPhantomPlayerBatch(players[])`
  - Update existing `createPlayer` to support phantom players
- [ ] **Build player claiming mechanism and validation logic**
  - `searchClaimablePlayersByEmail(email)`
  - `claimPlayer(userId, playerId)`
  - `validatePlayerClaim(userId, playerId, email)`
  - Atomic transaction for claiming process

---

## Phase 3: User Registration Enhancement

### 3. Registration Flow Updates
- [ ] **Extend user registration flow to support player claiming**
  - Modify `registerUser` to check for claimable players
  - Return claimable players in registration response
  - Handle claiming during registration process
- [ ] **Create admin interfaces for phantom player management**
  - Admin dashboard for phantom player overview
  - Individual phantom player editing
  - Convert anonymous phantom to claimable phantom
  - Bulk phantom player operations

---

## Phase 4: Circle Invitation System

### 4. Enhanced Invitations
- [ ] **Design enhanced circle invitation system for email invites**
  - New `EmailCircleInvite` type
  - Support for inviting non-users by email
  - Link email invites to phantom players
- [ ] **Implement email-based circle invitations**
  - `sendCircleInviteByEmail(circleId, email, invitedBy)`
  - `convertEmailInviteToUserInvite(emailInviteId, userId)`
  - Email invitation management functions
- [ ] **Build invitation redemption during registration flow**
  - Check for pending email invitations during signup
  - Auto-convert email invites to user invites
  - Auto-join circles upon registration

---

## Phase 5: User Interface & Experience

### 5. UI Components & Flows
- [ ] **Create claiming UI components and user flows**
  - Player claiming interface during registration
  - Claimable player card components
  - Claiming confirmation dialogs
  - Success/error states for claiming
- [ ] **Add phantom player indicators throughout the application**
  - Phantom player badges in player lists
  - Claimed/unclaimed status indicators
  - Different styling for phantom vs claimed players
  - Admin-only phantom player management views

---

## Phase 6: Advanced Features

### 6. Auditing & Bulk Operations
- [ ] **Implement audit trail for player claiming activities**
  - `PlayerClaimLog` collection
  - Track who claimed which player when
  - Admin interface for claim history
  - Dispute resolution tools
- [ ] **Create bulk phantom player import functionality**
  - CSV upload for phantom players
  - Batch creation with email validation
  - Progress indicators for large imports
  - Error handling and reporting

---

## Phase 7: Testing & Documentation

### 7. Quality Assurance
- [ ] **Test complete phantom player and claiming workflow**
  - End-to-end registration with claiming
  - Circle invitation flows with phantom players
  - Admin phantom player management
  - Edge cases and error scenarios
- [ ] **Update documentation and user guides**
  - Admin guide for phantom player management
  - User guide for claiming process
  - API documentation updates
  - Migration guide for existing installations

---

## Technical Architecture Overview

### Phantom Player Types
1. **Email-based Phantom Players**: Created with email for future claiming
2. **Anonymous Phantom Players**: No email, name-only, non-claimable

### Enhanced Player Interface
```typescript
export interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  // NEW FIELDS:
  claimedByUserId?: string;  // Links to User.id when claimed
  email?: string;            // Email for phantom players
  isPhantom?: boolean;       // True until claimed by user
  createdBy?: string;        // User ID who created this phantom player
  createdAt: string;         // When phantom player was created
  claimedAt?: string;        // When player was claimed by user
}
```

### Player States
- **Phantom Player**: `isPhantom: true, claimedByUserId: null`
- **Claimed Player**: `isPhantom: false, claimedByUserId: "user123"`
- **Direct Player**: `isPhantom: false, claimedByUserId: "user123"`

### Key Benefits
- **Immediate utility**: Track any player stats right away
- **Future flexibility**: Add claiming capability later
- **No forced requirements**: Don't need everyone's email upfront
- **Natural workflow**: Matches how clubs actually operate
- **Seamless experience**: Players discover existing history during signup

---

*This plan transforms the vision of pre-existing player profiles into actionable development tasks, building from database foundations through user experience, ensuring a robust phantom player system that seamlessly integrates with the existing circles functionality.*