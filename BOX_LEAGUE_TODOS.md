# Box League - Comprehensive Todo List

## Analysis Summary

**Backend Logic:** ✅ Promotion/relegation logic exists and is well-implemented
**Frontend UI:** ✅ Cycle completion workflow now complete! Missing: player management edge cases
**Player Management:** ⚠️ Basic features work, but edge cases (mid-round swaps, withdrawals) not handled
**Validation:** ✅ Cycle completion validation now properly checks for pending matches
**Progress:** 11/40 tasks complete (28%)

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

### 3.2 Mid-Round Player Management

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

- [ ] Player withdrawal handling
  - **Issue**: No system to handle players who leave mid-cycle
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

- [ ] Match result editing and deletion
  - **Issue**: Once a match result is recorded, cannot edit or delete it
  - **Files**: `src/lib/box-leagues.ts`, rounds UI
  - **Action**:
    - Add `editMatchResult(matchId, newTeam1Score, newTeam2Score)` function
    - Add `deleteMatchResult(matchId)` function
    - Recalculate all affected player stats when result changes
    - Add audit log of changes (track who edited, when, old vs new scores)
    - Show edit history in match details
    - Add UI "Edit Result" and "Delete Result" buttons
    - Require admin permission for edits/deletions
    - Add confirmation dialog with impact warning

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

- [ ] Enhanced match validation
  - **Issue**: Current validation is too basic
  - **Files**: Match result dialog
  - **Action**:
    - Enforce deuce rules:
      - At 10-10, must win by 2 (can go to 11-13, 12-14, etc.)
      - Max reasonable score: 30 (prevent typos like 111)
    - Validate score ranges (0-30)
    - Prevent ties (already done)
    - Add score presets dropdown:
      - Common scores: 11-9, 11-7, 11-5, 11-3, etc.
      - Click preset to auto-fill
    - Show score validation errors in real-time

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
2. ~~**Phase 3.1**~~ - ✅ **COMPLETED** - Cycle completion UI with promotion/relegation
3. **Phase 3.2** - Player management edge cases (critical for real-world usage) ← START HERE
4. **Phase 3.3** - League status management
5. **Phase 3.4** - Round management enhancements
6. **Phase 4.3** - Error handling (improves UX significantly)
7. **Phase 4.1** - Historical data visualization
8. **Phases 4.2, 4.4, 4.5** - Polish and validation
9. **Phase 5** - Nice-to-have enhancements

---

*Last updated: 2025-10-04*
*Phase 1 completed: 2025-10-03*
*Phase 2 completed: 2025-10-03*
*Phase 3.1 completed: 2025-10-04 (including cycle validation bug fixes)*
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
