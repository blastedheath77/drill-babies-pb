# PBstats User-Centric Transformation Plan

## Overview
Transform PBstats from a player-centric to a user-centric platform where Users are the primary entity, with connected Player records for game statistics. This ensures proper user management, circle-based access control, and enhanced social features.

## Current State Analysis

**Current Player/User Structure:**
- **Players**: Currently stored in Firestore as individual player records, most are "phantom" (not linked to users)
- **Users**: Authentication records with minimal profile data
- **Circles**: Group/club system for organizing players
- **Existing Features**: Player claiming system, phantom player management, circle invitations

**Key Issues to Address:**
1. Current "Players" are not explicitly marked as phantoms
2. New user registration doesn't automatically create connected player profiles
3. Limited user profile data (missing location, gender, DOB, DUPR ID)
4. Circle filtering needs "ALL CIRCLES" option
5. New users need guided onboarding to prevent seeing empty state

## Implementation Plan

### Phase 1: Data Migration & User Registration Enhancement

#### 1. Convert existing players to phantoms
- [ ] Update all current Player records to set `isPhantom: true`
- [ ] Ensure none are linked to users yet (set `claimedByUserId: null`)
- [ ] Create migration script to safely update existing data
- [ ] Test migration on development data first

#### 2. Enhanced user registration
- [ ] Add new profile fields to User schema:
  - [ ] Location (city, country)
  - [ ] Gender (Male, Female, Other)
  - [ ] DOB (optional)
  - [ ] DUPR ID (optional)
- [ ] Update registration form UI with new fields
- [ ] Create connected Player record automatically when user registers (non-phantom)
- [ ] Update user registration flow to handle Player creation
- [ ] Add form validation for new fields

#### 3. User profile management
- [ ] Create comprehensive user profile page
- [ ] Allow editing of all profile fields
- [ ] Display connected player stats and circle memberships
- [ ] Add profile completion indicators
- [ ] Ensure profile updates sync with connected Player record

### Phase 2: Circle System Improvements

#### 4. Enhanced circle filtering
- [ ] Add "ALL CIRCLES" option to circle selector UI
- [ ] Update `useCircles` hook to handle "all circles" mode
- [ ] Update all data fetching hooks (`usePlayers`, `useGames`, etc.) to handle "all circles" mode
- [ ] Ensure stats aggregate properly across multiple circles
- [ ] Test circle switching functionality

#### 5. New user onboarding flow
- [ ] Detect users with no circle memberships
- [ ] Create welcome screen component for new users
- [ ] Guide users through circle discovery/invitation process
- [ ] Add circle search and request functionality
- [ ] Prevent empty state confusion with helpful messaging

### Phase 3: Player Creation & Invitation Improvements

#### 6. Phantom player creation updates
- [ ] Ensure all new players created by users are marked as phantom by default
- [ ] Update player creation forms to set `isPhantom: true`
- [ ] Add email invitation feature for newly created phantom players
- [ ] Connect phantom creation to current circle context
- [ ] Update player creation UI to explain phantom concept

#### 7. Enhanced user search & invitations
- [ ] Add geographical filtering to user search
- [ ] Include gender and location in search results UI
- [ ] Add location-based user suggestions
- [ ] Improve invitation system with proximity-based recommendations
- [ ] Update search algorithms to include new profile fields

### Phase 4: Database Schema Updates

#### 8. User profile schema enhancement
- [ ] Add location fields (city, country) to User type
- [ ] Add gender field (Male, Female, Other) to User type
- [ ] Add optional DOB field to User type
- [ ] Add optional DUPR ID field to User type
- [ ] Update TypeScript types in `src/lib/types.ts`
- [ ] Ensure backward compatibility with existing data

#### 9. Player-User relationship cleanup
- [ ] Strengthen connection between User and Player records
- [ ] Add validation to prevent orphaned Player records
- [ ] Update all player-related queries to respect user-player connections
- [ ] Update all mutations to maintain data consistency
- [ ] Add database constraints and validation rules

### Phase 5: UI/UX Updates

#### 10. Navigation and context updates
- [ ] Update main navigation to show current circle context
- [ ] Add circle switcher to main header/sidebar
- [ ] Update page titles and breadcrumbs to reflect circle context
- [ ] Ensure consistent circle filtering across all pages

#### 11. Stats and analytics updates
- [ ] Update player stats to aggregate across selected circles
- [ ] Update leaderboards to respect circle filtering
- [ ] Add "ALL CIRCLES" stats views where appropriate
- [ ] Update charts and graphs to handle multi-circle data

### Phase 6: Testing & Validation

#### 12. Comprehensive testing
- [ ] Test all user registration flows
- [ ] Test player claiming functionality with new schema
- [ ] Test circle invitation and membership management
- [ ] Test data migration scripts thoroughly
- [ ] Perform user acceptance testing

#### 13. Data integrity checks
- [ ] Validate all User-Player connections
- [ ] Ensure no orphaned records exist
- [ ] Verify circle membership data consistency
- [ ] Check phantom player status accuracy

## Technical Implementation Notes

### Database Schema Changes
```typescript
// Enhanced User type
interface User {
  id: string;
  email: string;
  name: string;
  // New fields
  location?: {
    city: string;
    country: string;
  };
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string; // ISO date string
  duprId?: string;
  connectedPlayerId?: string; // Link to Player record
  // ... existing fields
}

// Enhanced Player type
interface Player {
  id: string;
  name: string;
  isPhantom: boolean; // Ensure all existing players are marked as phantom
  claimedByUserId?: string; // Link to User who claimed/owns this player
  // ... existing fields
}
```

### Migration Strategy
1. **Backup existing data** before any migrations
2. **Run migrations in development** environment first
3. **Test thoroughly** after each migration step
4. **Rollback plan** ready for each migration step
5. **Monitor data integrity** throughout process

### Key Considerations
- **Backward Compatibility**: Ensure existing functionality continues to work during transition
- **Data Integrity**: Maintain referential integrity between Users and Players
- **Performance**: Monitor query performance with new schema and relationships
- **User Experience**: Minimize disruption to existing users during migration

## Success Criteria
- [ ] All existing players successfully marked as phantom
- [ ] New user registration creates connected player records
- [ ] Circle filtering works seamlessly with "ALL CIRCLES" option
- [ ] User profiles display comprehensive information
- [ ] No data loss or corruption during migration
- [ ] Existing users can continue using the app without disruption
- [ ] New users have clear onboarding experience

## Risks & Mitigation
- **Data Migration Risk**: Comprehensive testing and backup strategy
- **User Confusion**: Clear communication and gradual rollout
- **Performance Impact**: Query optimization and monitoring
- **Breaking Changes**: Thorough backward compatibility testing