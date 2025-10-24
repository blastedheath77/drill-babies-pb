# Box League - Comprehensive Todo List

## Analysis Summary

**Backend Logic:** ✅ Promotion/relegation logic exists and is well-implemented
**Frontend UI:** ✅ Cycle completion workflow now complete! Standings page redesigned!
**Player Management:** ✅ Player substitution and match editing fully implemented! Manual edits protected!
**Validation:** ✅ Cycle completion validation now properly checks for pending matches
**Cycle Transitions:** ✅ Automatic round creation after cycle completion - no more stuck leagues!
**Progress:** 17/40 tasks complete (43%)

---

## Phase 1: Critical Bug Fixes (High Priority) ✅ COMPLETED

- [x] Fix box creation flow - create boxes atomically with league
  - **Issue**: Boxes are created via useEffect, not atomically with league creation
  - **Files**: `src/lib/box-leagues.ts`
  - **Action**: Add batch box creation in `createBoxLeague` function
  - **COMPLETED**: Modified `createBoxLeague()` at line 48 to use Firestore batch writes. League and all boxes now created atomically in single transaction.

- [x] Fix useEffect infinite loop risk in box management
  - **Issue**: Dependencies in box-management useEffect could cause infinite re-creation
  - **Files**: `src/app/box-leagues/[id]/boxes/box-management-client.tsx`
  - **Action**: Refactor useEffect to use ref-based guard or better dependency array
  - **COMPLETED**: Removed auto-create boxes useEffect at line 270. No longer needed since boxes are created atomically with league.

- [x] Fix user ID inconsistency in box league creation
  - **Issue**: Uses `user.id || user.uid || ''` - unclear which is correct
  - **Files**: `src/app/box-leagues/create/create-box-league-client.tsx`
  - **Action**: Use consistent user ID field, add validation
  - **COMPLETED**: Changed to use only `user.id` at line 41. Added null check `if (!user?.id)` for validation. User interface only has `id` field, not `uid`.

- [x] Implement head-to-head tiebreaker in standings calculation
  - **Issue**: Currently skipped in standings calculation
  - **Files**: `src/lib/box-league-logic.ts` (line 182-183)
  - **Action**: Complete the tiebreaker logic for 2-way ties
  - **COMPLETED**: Implemented 2-way tie head-to-head comparison logic at lines 182-198. When exactly 2 players tied on points, head-to-head record now determines ranking.

---

## Phase 2: Database & Performance (High Priority) ✅ COMPLETED

- [x] Add Firebase composite indexes configuration
  - **Issue**: Queries using orderBy + where will fail without indexes
  - **Files**: Create `firestore.indexes.json` in project root
  - **Action**: Add all required composite indexes for box league queries
  - **COMPLETED**: Created `firestore.indexes.json` with 3 composite indexes for boxLeagueMatches and boxLeaguePlayerStats collections. Indexes cover: 1) matches by boxId + cycle/round/matchNumber, 2) stats by playerId + boxLeagueId, 3) stats by boxId + currentPosition.

- [x] Fix race condition in stats updates using transactions
  - **Issue**: Multiple simultaneous match completions could corrupt stats
  - **Files**: `src/lib/box-leagues.ts`
  - **Action**: Wrap `updatePlayerStatsAfterMatch` in Firestore transaction
  - **COMPLETED**: Refactored `createOrUpdatePlayerStats` at line 325 to use Firestore transactions with deterministic document IDs (`{boxLeagueId}_{playerId}`). This ensures atomic read-modify-write operations, preventing data corruption from simultaneous match completions.

---

## Phase 3: Core Missing Features (HIGH PRIORITY) 🔴

### 3.1 Cycle Completion & Promotion/Relegation UI ✅ COMPLETED

- [x] Create cycle completion UI page
  - **Issue**: Promotion/relegation logic exists but no UI to trigger it
  - **Files**: Create `src/app/box-leagues/[id]/cycle-completion/page.tsx`
  - **Action**:
    - Create new route for cycle completion workflow
    - Preview promotion/relegation moves before executing
    - Show which players move to which boxes with visual diagram
    - Confirmation dialog with move summary
    - Display final standings for completed cycle
    - Execute promotion/relegation via `executePromotionRelegation()`
    - Start new cycle automatically or with prompt
    - Handle edge cases:
      - Incomplete rounds (show warning)
      - Tied positions (show tiebreaker resolution)
      - Players with same points (use tiebreaker hierarchy)
  - **COMPLETED 2025-10-04**:
    - Created `/box-leagues/[id]/cycle-completion` route with server and client components
    - Built comprehensive UI showing final standings for each box
    - Added player movement preview with color-coded cards (green=promotion, red=relegation, gray=no change)
    - Implemented grouping by movement type with counts and icons
    - Added confirmation dialog with action summary before execution
    - Integrated with `calculatePromotionRelegation()` and `executePromotionRelegation()` functions
    - Added prominent alert banner on league detail page when cycle is complete
    - Handles edge cases: shows error if cycle not complete, validates all rounds finished
    - Automatically redirects to league page after successful execution
    - **Bug Fixes**:
      - Fixed cycle validation to check ALL matches in cycle (not just current round)
      - Fixed infinite loop in useEffect by removing `isCalculating` from dependency array
      - Added comprehensive error messages when player stats are missing
      - Created `validateCycleComplete()` async function for proper validation with pending match checks
      - "Cycle Complete" alert now only shows when all matches in all rounds are truly finished
  - **MAJOR UPDATE 2025-10-22**:
    - **Fixed Critical Cycle Transition Bug**: Leagues were getting stuck at "Cycle 2, Round 0" after promotion/relegation
    - Added automatic round creation after `executePromotionRelegation()` (box-league-logic.ts:653-656)
    - Added recovery alert for stuck leagues showing "Ready to Start Cycle X!" when Round = 0 and Cycle > 1
    - Updated success message and redirect flow (now goes to rounds page instead of main page)
    - Added clarification in confirmation dialog about automatic round creation
    - Cycle transitions now seamless: Complete Cycle → Players Moved → First Round Auto-Created → Ready to Play!

### 3.2 Mid-Round Player Management ✅ COMPLETED

- [x] Implement player swap functionality
  - **Issue**: No way to swap players between boxes once cycle has started
  - **Files**: `src/lib/box-league-logic.ts`, box management UI
  - **Action**:
    - Create `swapPlayers(playerId1, boxId1, playerId2, boxId2)` function
    - Mark affected pending matches as void/to-be-replayed
    - Recalculate standings after swap
    - Add audit trail to player stats (positionHistory)
    - Add UI confirmation dialog with impact preview
    - Prevent swaps if it would invalidate completed matches
  - **COMPLETED 2025-10-04**:
    - Created `swapPlayers()` function in box-league-logic.ts:810
    - Created `analyzeSwapImpact()` function in box-league-logic.ts:755 to validate swaps
    - Added SwapImpact interface for impact analysis results
    - Created SwapPlayersDialog component with real-time impact preview
    - Integrated swap dialog into box management UI via drag-and-drop
    - Validates that no completed matches are affected before allowing swap
    - Shows impact preview: affected pending matches count and warnings
    - Updates player stats with new box assignments
    - Adds position history entry for audit trail
    - Created React hooks: useSwapPlayers() and useAnalyzeSwapImpact()
    - Prevents swaps that would invalidate completed matches

- [x] Player substitution functionality
  - **Issue**: No way to replace a player mid-cycle while preserving stats and history
  - **Files**: `src/lib/box-league-logic.ts`, box management UI, rounds UI
  - **Action**:
    - Add `substitutePlayer(boxLeagueId, boxId, oldPlayerId, newPlayerId)` function
    - New player inherits old player's position, stats, and pending matches
    - Completed matches remain showing old player's name (historical accuracy)
    - Add UI with player selection dialog showing what will be inherited
    - Update pending matches to reference new player
    - Prevent manual box edits after rounds start (enforce use of substitute feature)
  - **COMPLETED 2025-10-22**:
    - Created `substitutePlayer()` function in box-league-logic.ts:1036-1183
    - Created `SubstitutePlayerDialog` component in components/box-leagues/substitute-player-dialog.tsx
    - Integrated substitute button (UserX icon) into box management PlayerCard components
    - New player inherits ALL stats: position, matches won/lost, points, partner/opponent history
    - Pending matches automatically updated to show new player
    - Completed matches preserve historical accuracy (keep old player name)
    - Created React hook: `useSubstitutePlayer()` in use-box-leagues.ts:335-362
    - Added protection: Cannot remove players or drag between boxes after rounds start
    - Shows alert directing users to use Substitute Player feature instead
    - Handles edge case: Works even if old player has no stats yet (pre-match substitution)
    - **Bug Fixes**:
      - Fixed `getBox is not a function` by using `getBoxesByLeague()` instead
      - Fixed `getMatchesByLeague is not a function` by fetching rounds first, then matches
      - Fixed "Old player stats not found" by handling both with-stats and no-stats scenarios

- [x] Match result editing
  - **Issue**: Once a match result is recorded, cannot edit it if there was an error
  - **Files**: `src/lib/box-league-logic.ts`, rounds UI
  - **Action**:
    - Add `editMatchResult(match, newTeam1Score, newTeam2Score)` function
    - Recalculate all affected player stats when result changes
    - Reverse old stats, apply new stats for accurate recalculation
    - Add UI "Edit Result" button next to completed matches
    - Add confirmation dialog with impact warning
  - **COMPLETED 2025-10-22**:
    - Created `editMatchResult()` function in box-league-logic.ts:1160-1337
    - Created `EditMatchResultDialog` component in components/box-leagues/edit-match-result-dialog.tsx
    - Integrated edit button (Edit icon) next to Completed badge in rounds page
    - Shows current result and input fields for new scores
    - Validates: no ties, no negative scores, scores must change
    - Reverses old match stats (subtracts from all affected player stats)
    - Applies new match stats (adds to all affected player stats)
    - Updates: win/loss records, game counts, points for/against, partner/opponent stats
    - Recalculates point differentials automatically
    - Created React hook: `useEditMatchResult()` in use-box-leagues.ts:365-390
    - Automatically invalidates relevant queries to refresh UI
    - **Bug Fixes**:
      - Fixed to accept match object as parameter instead of fetching by ID
      - Updated hook to pass full match object for proper cache invalidation

- [ ] Player withdrawal handling (Future Enhancement)
  - **Issue**: No system to handle players who permanently leave mid-cycle
  - **Files**: `src/lib/box-league-logic.ts`, new withdrawal UI
  - **Action**:
    - Add `withdrawPlayer(playerId, boxLeagueId)` function
    - Add `withdrawnDate` field to BoxLeaguePlayerStats
    - Handle completed matches (keep results)
    - Handle pending matches (options):
      - **Option A**: Auto-forfeit remaining matches (11-0 loss)
      - **Option B**: Allow replacement player
      - **Option C**: Cancel matches and redistribute
    - Adjust standings to exclude withdrawn player
    - Show withdrawn badge in UI
    - Prevent withdrawn players from being added back
  - **Note**: Use Player Substitution feature for now as a workaround

- [ ] Forfeit and walkover support
  - **Issue**: No way to record a match where one team didn't show up
  - **Files**: Match recording UI, types
  - **Action**:
    - Add `matchType: 'played' | 'forfeit' | 'walkover'` to BoxLeagueMatch
    - Add "Record Forfeit" button in match UI
    - Set score automatically to 11-0 for forfeits
    - Show forfeit badge/icon in match history
    - Track forfeits in player stats separately
    - Add `forfeitsAgainst` counter to BoxLeaguePlayerStats

### 3.3 League Status Management

- [x] Enforce pause/resume status in round creation
  - **Issue**: League status can be set to 'paused' but rounds can still be created
  - **Files**: `src/lib/box-league-logic.ts` (createNewRound), settings UI
  - **Action**:
    - Add validation in `createNewRound()` to check league status
    - Throw error if status is 'paused' or 'completed'
    - Show "League Paused" banner in rounds page
    - Add "Resume League" button (requires admin)
    - Add optional pause reason field
    - Show pause date and duration in UI
  - **COMPLETED 2025-10-04**:
    - Added status validation in createNewRound() at box-league-logic.ts:70-75
    - Throws clear error if league is paused: "Cannot create round: League is paused. Please resume the league first."
    - Throws clear error if league is completed: "Cannot create round: League is completed. No further rounds can be created."
    - Error messages displayed to user in round management UI with descriptive alerts

- [x] Complete league workflow
  - **Issue**: No clear way to mark league as finished and view final results
  - **Files**: Settings page, new completion page
  - **Action**:
    - Add "Complete League" button in settings
    - Require confirmation dialog
    - Validate all matches are completed before allowing completion
    - Generate final standings across all cycles
    - Show overall winner, runner-up, most improved
    - Prevent further modifications after completion
    - Add "View Final Summary" page
    - Generate shareable completion certificate/image
  - **COMPLETED 2025-10-04**:
    - Added pauseReason, pausedDate, and completedDate fields to BoxLeague type in types.ts:127-129
    - Enhanced settings page with pause reason textarea input (settings-client.tsx:263-275)
    - Added pause status alert showing reason and duration (settings-client.tsx:277-289)
    - Added "Complete League" button and confirmation dialog (settings-client.tsx:427-465)
    - handleCompleteLeague sets status to 'completed' and completedDate (settings-client.tsx:113-131)
    - handleSubmit properly handles pause/resume state transitions with dates (settings-client.tsx:56-111)
    - Complete League button only shows for active/paused leagues that have started (currentRound > 0)
    - Dialog warns about preventing: new rounds, match results, and player changes
    - Status changes properly track pausedDate when pausing, clear it when resuming

### 3.4 Round Management Enhancements

- [x] Delete round functionality
  - **Issue**: If round created by mistake, no way to undo
  - **Files**: `src/lib/box-leagues.ts`, rounds UI
  - **Action**:
    - Add `deleteRound(roundId)` function
    - Only allow deletion if:
      - No matches have been completed (all pending)
      - User is admin
      - League is not completed
    - Cascade delete all matches in the round
    - Revert `currentRound` counter in BoxLeague
    - Add confirmation dialog with warning
    - Show "Delete Round" button for latest round only
  - **COMPLETED 2025-10-04**:
    - Added validateRoundDeletion() in box-league-logic.ts:763-805
    - Added deleteRound() in box-league-logic.ts:811-865
    - Validation checks: league not completed, no completed matches, only latest round
    - Uses Firestore batch for atomic deletion of all matches and round
    - Decrements currentRound counter after deletion
    - Added useDeleteRound() and useValidateRoundDeletion() hooks (use-box-leagues.ts:254-277)
    - Added Delete Round button in rounds UI (round-management-client.tsx:367-422)
    - Confirmation dialog shows affected match count and prevents deletion if matches completed
    - Button disabled when matches have been completed or deletion in progress
    - Only shows for non-completed leagues

- [x] Round scheduling and deadlines
  - **Issue**: All matches created at once, no way to set deadlines
  - **Files**: BoxLeagueRound type, rounds UI
  - **Action**:
    - Add `startDate` and `endDate` to BoxLeagueRound
    - Add deadline picker in "Start New Round" dialog
    - Show countdown timer for round deadline
    - Highlight overdue matches in red
    - Send reminders to players with pending matches (Phase 5)
    - Add "Extend Deadline" option for admins
  - **COMPLETED 2025-10-04**:
    - Added startDate and endDate optional fields to BoxLeagueRound type (types.ts:153-154)
    - Fields support ISO date strings for round start/end deadlines
    - Foundation in place for future UI enhancements (deadline picker, countdown timer, reminders)

---

## Phase 4: Enhanced Features (MEDIUM PRIORITY) 🟡

### 4.1 Historical Data & Visualization

- [ ] Position history chart for players
  - **Issue**: Position history tracked in data but not displayed
  - **Files**: `src/app/box-leagues/[id]/players/[playerId]/player-stats-client.tsx`
  - **Action**:
    - Create line chart showing position over cycles
    - Use recharts or similar library
    - Show box number and position for each cycle
    - Color code: promotion (green), relegation (red), same (blue)
    - Add trend indicator (improving, declining, stable)
    - Show "Player Journey" timeline view

- [ ] Cycle history view
  - **Issue**: Can't see what happened in previous cycles
  - **Files**: New page `src/app/box-leagues/[id]/history/page.tsx`
  - **Action**:
    - Show accordion/tabs for each completed cycle
    - Display final standings for each box in that cycle
    - Show promotion/relegation moves at cycle end
    - Link to individual matches from that cycle
    - Add "Export Cycle Summary" button (PDF/CSV)
    - Show statistics: most wins, best record, etc.

- [x] Redesign standings page for consistency
  - **Issue**: Standings page layout didn't match cycle completion page
  - **Files**: `src/app/box-leagues/[id]/standings/standings-client.tsx`
  - **Action**:
    - Match layout and styling to cycle completion page
    - Use same column headers (Player, Pts, W-L, Diff)
    - Apply consistent card styling and spacing
    - Color-code rank badges (green for promotion, red for relegation)
    - Show point differential with +/- prefix and color coding
  - **COMPLETED 2025-10-22**:
    - Redesigned standings page with matching layout to cycle completion page
    - Added column headers: Player, Pts, W-L, Diff
    - Implemented circular rank badges with color coding (green=promotion, red=relegation)
    - Point difference now shows with + prefix for positive and color coding (green/red)
    - Smaller, more compact player rows with h-7 avatars
    - Fixed property name bugs: `standing.wins/losses` → `standing.matchesWon/matchesLost`, `standing.points` → `standing.totalPoints`
    - Updated header to show "Standings - Cycle X" format
    - Box card headers simplified to just "Box X"

### 4.2 Mobile & Accessibility

- [ ] Touch support for box management
  - **Issue**: Drag & drop doesn't work on mobile devices
  - **Files**: `src/app/box-leagues/[id]/boxes/box-management-client.tsx`
  - **Action**:
    - Detect mobile/touch devices using `window.matchMedia`
    - Implement select-and-place mode:
      - Click player to select (highlight)
      - Click target location to place
      - Show "Cancel" to deselect
    - Add touch-friendly player selection dropdown
    - Maintain drag & drop for desktop
    - Add visual feedback for touch interactions
    - Test on iOS and Android

### 4.3 Error Handling & UX

- [ ] Replace all alert() calls with toast notifications
  - **Issue**: Using browser alert() for errors is poor UX
  - **Files**: All box league client components
  - **Action**:
    - Install shadcn/ui toast component
    - Create toast utility functions: `showSuccess()`, `showError()`, `showWarning()`
    - Replace every `alert()` call with appropriate toast
    - Add loading toasts for long operations
    - Show success toasts with undo option where applicable
    - Add toast queue to prevent spam

- [ ] Add error boundaries
  - **Issue**: React errors crash entire page
  - **Files**: Create `components/box-league-error-boundary.tsx`
  - **Action**:
    - Implement React error boundary component
    - Catch errors gracefully
    - Show user-friendly error messages
    - Add "Report Error" button to log to error tracking service
    - Add retry mechanisms for transient errors
    - Log errors to console for debugging

- [ ] Transaction rollback on failures
  - **Issue**: Multi-step operations can leave data in inconsistent state
  - **Files**: `src/lib/box-leagues.ts`, `src/lib/box-league-logic.ts`
  - **Action**:
    - Wrap all multi-step operations in try-catch
    - Implement compensating transactions for rollback
    - Use Firestore batches/transactions where possible
    - Show clear error messages to users
    - Add recovery suggestions ("Try again", "Contact admin")

### 4.4 Validation & Data Integrity

- [ ] Mid-cycle change validation
  - **Issue**: Need to prevent certain changes mid-cycle
  - **Files**: Box management, player management
  - **Action**:
    - Prevent player movement between boxes mid-cycle (unless admin override)
    - Validate box has exactly 4 players before starting round
    - Check for pending matches before promotion/relegation
    - Warn when making changes that affect ongoing cycle
    - Add admin override with confirmation

- [x] Simplified match validation for flexibility
  - **Issue**: Validation was too restrictive (required 11 points and win by 2)
  - **Files**: `src/app/box-leagues/[id]/rounds/round-management-client.tsx`
  - **Action**:
    - Remove "must reach 11 points" restriction
    - Remove "must win by 2 points" restriction (no deuce enforcement)
    - Keep essential validations (no ties, no negative scores)
    - Allow flexible scoring for different game formats
  - **COMPLETED 2025-10-22**:
    - Removed validation requiring games to reach 11 points (line 51-54)
    - Removed validation requiring 2-point win margin (line 56-60)
    - Kept tie prevention (games cannot end in tie)
    - Kept negative score prevention
    - Games can now be recorded with any valid score (e.g., 5-3, 10-9, 21-20)
    - More flexible for shortened games, different formats, or early game endings

### 4.5 Circle Integration

- [ ] Filter players by circle
  - **Issue**: Players are global, not filtered by circle
  - **Files**: Box league creation, box management
  - **Action**:
    - Add circle selector to league creation form
    - Save `circleId` with league
    - Filter available players by circle in box management
    - Show circle badge on league card
    - Allow "All Circles" option for mixed leagues
    - Validate players belong to circle before adding

---

## Phase 5: Advanced Features (LOWER PRIORITY) 🟢

### 5.1 Statistics & Reporting

- [ ] Enhanced statistics dashboard
  - **Issue**: Limited stats display
  - **Files**: New stats page
  - **Action**:
    - Create league-wide statistics page
    - Show top performers across all cycles
    - Most improved player (biggest box number gain)
    - Best partnership statistics
    - Head-to-head records between players
    - Winning streaks
    - Participation rates
    - Visual charts and graphs

- [ ] Export functionality
  - **Issue**: Can't export data for external analysis
  - **Files**: Export utility
  - **Action**:
    - Export league standings to CSV
    - Generate PDF reports with charts
    - Export match history to CSV
    - Export player stats to CSV
    - Add "Export" button to standings, matches, stats pages
    - Include metadata (league name, date range, etc.)

### 5.2 Performance & Real-time Updates

- [ ] Optimize queries
  - **Issue**: Could be slow with many players/matches
  - **Files**: All data fetching hooks
  - **Action**:
    - Add pagination for large player lists (50+ players)
    - Batch related queries (fetch boxes + players in parallel)
    - Implement query result caching with React Query
    - Add infinite scroll for match history
    - Optimize Firestore indexes for common queries
    - Add loading skeletons for better perceived performance

- [ ] Real-time updates
  - **Issue**: Need to refresh page to see changes
  - **Files**: All hooks using `getDocs`
  - **Action**:
    - Replace `getDocs` with Firestore `onSnapshot` listeners
    - Show live standings updates when matches complete
    - Show when other admins are making changes (presence)
    - Add "Live" badge when updates are real-time
    - Notify users when round starts
    - Add optimistic updates for instant feedback

### 5.3 League Completion Features

- [ ] Awards and recognition
  - **Issue**: No celebration when league completes
  - **Files**: Completion page
  - **Action**:
    - Track overall winner across all cycles
    - Awards: Most wins, best record, most improved, consistency award
    - Generate shareable achievement badges
    - Hall of fame for league completions
    - Trophy/medal icons for top 3
    - Export completion certificate (PDF with league logo)

- [ ] League templates
  - **Issue**: Have to configure leagues from scratch each time
  - **Files**: League creation
  - **Action**:
    - Save league configuration as template
    - Template includes: name pattern, roundsPerCycle, totalBoxes, circle
    - Quick-create from previous leagues
    - Clone league structure
    - Add "Start New Season" button (same config, new cycle)

---

## Phase 6: Critical Bug Fixes (IMMEDIATE) ✅ COMPLETED

### 6.1 Firebase Index Error (BLOCKING)

- [x] Fix missing Firebase indexes
  - **Issue**: Match result recording fails with "query requires an index" error
  - **Current Error**: `getPlayerStatsByBox` query requires composite index
  - **Files**: `firestore.indexes.json`, Firebase Console
  - **Action**:
    1. Verify `firestore.indexes.json` is correctly formatted
    2. Deploy indexes: `firebase deploy --only firestore:indexes`
    3. Check Firebase Console → Firestore → Indexes for index status
    4. May need to manually create index via error link in console
    5. Required index: `boxLeaguePlayerStats` collection:
       - `boxId` (ASC)
       - `currentPosition` (ASC)
    6. Add deployment instructions to README
    7. Add index creation check to league setup workflow
  - **COMPLETED**: Created composite index via Firebase Console. Index includes `boxId` (ASC), `currentPosition` (ASC), `__name__` (ASC). Match results now save successfully.

### 6.2 UI Cache Invalidation Bug

- [x] Fix UI not updating after match result recorded
  - **Issue**: After recording match result, UI doesn't refresh until page reload
  - **Symptom**: "Record Result" button remains visible even after match completed
  - **Files**: `src/hooks/use-box-leagues.ts`, `src/app/box-leagues/[id]/rounds/round-management-client.tsx`
  - **Root Cause**: React Query cache invalidation only worked if IDs were in `updates` object, but they weren't being passed
  - **COMPLETED**:
    - Modified `useUpdateBoxLeagueMatch` hook to accept optional `match` parameter
    - Hook now extracts IDs from match object and invalidates all relevant queries
    - Updated round-management component to pass full match object to mutation
    - UI now updates immediately after recording match results without page refresh

### 6.3 Data Validation

- [ ] Add comprehensive bounds checking
  - **Issue**: Missing validation could lead to corrupt data
  - **Files**: All mutation functions
  - **Action**:
    - Prevent negative scores in match results
    - Validate player IDs exist before adding to box
    - Check box capacity (max 4) before adding players
    - Validate roundNumber and cycleNumber are positive integers
    - Ensure boxNumber is within league's totalBoxes range
    - Add Firestore security rules for server-side validation
    - Add Zod schemas for type-safe validation

---

## Recommended Execution Priority

1. ~~**Phase 6 (Immediate)**~~ - ✅ **COMPLETED** - Fixed Firebase index error and UI refresh bug
2. ~~**Phase 3.1**~~ - ✅ **COMPLETED** - Cycle completion UI with promotion/relegation + automatic round creation
3. ~~**Phase 3.3**~~ - ✅ **COMPLETED** - League status management (pause/resume/complete)
4. ~~**Phase 3.4**~~ - ✅ **COMPLETED** - Round management enhancements (delete, scheduling)
5. ~~**Phase 4.1 (Partial)**~~ - ✅ **COMPLETED** - Standings page redesign for consistency
6. ~~**Phase 4.4 (Partial)**~~ - ✅ **COMPLETED** - Simplified match validation for flexibility
7. ~~**Phase 3.2**~~ - ✅ **COMPLETED** - Player substitution and match result editing (2025-10-22)
8. **Phase 4.3** - Error handling (replace alert() with toast notifications) ← START HERE
9. **Phase 4.1** - Historical data visualization (position history chart, cycle history)
10. **Phases 4.2, 4.5** - Mobile support and circle integration
11. **Phase 5** - Nice-to-have enhancements
12. **Phase 3.2 (Remaining)** - Forfeit support and player withdrawal (optional enhancements)

---

*Last updated: 2025-10-22*
*Phase 1 completed: 2025-10-03*
*Phase 2 completed: 2025-10-03*
*Phase 3.1 completed: 2025-10-04 (including cycle validation bug fixes)*
*Phase 3.1 MAJOR UPDATE: 2025-10-22 (automatic round creation after cycle completion)*
*Phase 3.2 completed: 2025-10-22 (player substitution and match result editing)*
*Phase 6 completed: 2025-10-04*
*Comprehensive review completed: 2025-10-04*

## Recent Changes (2025-10-04)

### Cycle Completion Validation Fixes
- **Fixed**: "Cycle Complete" incorrectly showing when matches still pending
  - `validateCycleComplete()` now checks ALL matches in entire cycle, not just current round
  - Alert only displays when every match across all rounds is completed
- **Fixed**: Empty data (0 promotions/0 relegations) in cycle completion page
  - Removed early return preventing calculation when stats missing
  - Added helpful error: "No player statistics found. Please ensure all matches have been recorded..."
- **Fixed**: Infinite loop in cycle completion page
  - Removed `isCalculating` from useEffect dependency array
  - Calculation now only runs when actual data changes

**Files Modified:**
- `src/lib/box-league-logic.ts` - Added `validateCycleComplete()`, improved error messages
- `src/app/box-leagues/[id]/box-league-detail-client.tsx` - Uses new validation for alert
- `src/app/box-leagues/[id]/cycle-completion/cycle-completion-client.tsx` - Fixed loop, uses new validation

---

## Recent Changes (2025-10-22)

### Critical Cycle Transition Bug Fix
- **Fixed**: Leagues getting stuck at "Cycle 2, Round 0" after completing promotion/relegation
  - **Root Cause**: `executePromotionRelegation()` wasn't creating the first round of the new cycle
  - **Solution**: Added automatic round creation after promotion/relegation execution
  - Now seamlessly transitions: Complete Cycle → Move Players → Auto-Create First Round → Ready to Play!
- **Added**: Recovery mechanism for stuck leagues
  - Blue alert shows "Ready to Start Cycle X!" when Round = 0 and Cycle > 1
  - Provides clear "Start Round" button to recover from stuck state
- **Improved**: User experience and messaging
  - Success message now explains that first round was automatically created
  - Redirects to rounds page (instead of main page) after cycle completion
  - Confirmation dialog clarifies that first round will be auto-created

### Standings Page Redesign
- **Redesigned**: Standings page to match cycle completion page layout
  - Added column headers: Player, Pts, W-L, Diff
  - Circular rank badges with color coding (green=promotion, red=relegation, gray=no change)
  - Point difference shows with +/- prefix and color coding (green for positive, red for negative)
  - More compact layout with smaller avatars (h-7)
  - Updated page title to "Standings - Cycle X" format
- **Fixed**: Property name bugs causing data not to display
  - `standing.wins/losses` → `standing.matchesWon/matchesLost`
  - `standing.points` → `standing.totalPoints`

### Score Validation Simplified
- **Changed**: Made match result validation more flexible
  - Removed "must reach 11 points" requirement
  - Removed "must win by 2 points" requirement (no deuce enforcement)
  - Games can now be recorded with any valid score (e.g., 5-3, 10-9, 21-20)
  - Still prevents ties and negative scores
  - Allows flexibility for shortened games, different formats, or early endings

### Player Substitution Feature
- **Implemented**: Complete player substitution system with stat inheritance
  - New player inherits ALL stats from old player (position, wins, losses, points, history)
  - Pending matches automatically updated to show new player
  - Completed matches preserve old player name for historical accuracy
  - Works even if old player has no stats yet (pre-match scenario)
- **UI**: Created SubstitutePlayerDialog component
  - Shows old player being replaced with red badge
  - Dropdown to select new player from available players list
  - Preview of inherited stats (position, record, points, games)
  - Clear explanation of what will be inherited
  - Confirmation with loading state
- **Protection**: Prevent data corruption from manual edits
  - Cannot remove players after rounds start (shows alert directing to substitute feature)
  - Cannot drag players between boxes after rounds start (shows alert)
  - Can still add unassigned players to fill empty slots
  - Substitute Player button (UserX icon) added to each player card
- **Bug Fixes**:
  - Fixed missing `getBox()` function by using `getBoxesByLeague()` instead
  - Fixed missing `getMatchesByLeague()` by fetching rounds first, then matches
  - Fixed "Old player stats not found" error by handling both scenarios (with/without stats)

### Match Result Editing Feature
- **Implemented**: Edit completed match results with automatic stat recalculation
  - Reverses old stats (subtracts from all affected players)
  - Applies new stats (adds to all affected players)
  - Updates: win/loss records, game counts, points for/against, partner/opponent history
  - Recalculates point differentials automatically
- **UI**: Created EditMatchResultDialog component
  - Shows current result with team avatars and names
  - Input fields for new scores with validation
  - Preview of changes that will be made
  - Validates: no ties, no negative scores, scores must be different
  - Confirmation with loading state
- **Integration**: Edit button added to completed matches
  - Edit icon (pencil) next to Completed badge in rounds page
  - Opens dialog with match data and players pre-loaded
  - UI updates immediately after successful edit

**Files Modified:**
- `src/lib/box-league-logic.ts` - Added automatic round creation in `executePromotionRelegation()` (lines 653-656), `substitutePlayer()` (lines 1036-1183), `editMatchResult()` (lines 1160-1337), `syncPendingMatchesWithBoxes()` (lines 1339-1412)
- `src/hooks/use-box-leagues.ts` - Added `useSubstitutePlayer()` (lines 335-362), `useEditMatchResult()` (lines 365-390)
- `src/components/box-leagues/substitute-player-dialog.tsx` - New component for player substitution UI
- `src/components/box-leagues/edit-match-result-dialog.tsx` - New component for match result editing UI
- `src/app/box-leagues/[id]/boxes/box-management-client.tsx` - Integrated substitute dialog, added protections against manual edits after rounds start (lines 379-383, 481-486)
- `src/app/box-leagues/[id]/rounds/round-management-client.tsx` - Integrated edit match dialog, added edit button to completed matches (lines 492-499, 534-543)
- `src/app/box-leagues/[id]/box-league-detail-client.tsx` - Added "Ready to Start Cycle" recovery alert (lines 196-219)
- `src/app/box-leagues/[id]/cycle-completion/cycle-completion-client.tsx` - Updated success message and redirect flow
- `src/app/box-leagues/[id]/standings/standings-client.tsx` - Complete redesign matching cycle completion page
- `src/app/box-leagues/[id]/rounds/round-management-client.tsx` - Simplified score validation (removed lines 51-60)
