# DUPR Integration - Implementation Todo List

## Summary

**Feasibility:** HIGHLY FEASIBLE - PBstats is well-positioned for DUPR integration

**Key Strengths:**
- ✅ Already uses DUPR-compatible rating scale (2.0-8.0)
- ✅ Implements DUPR-style rating calculations
- ✅ Captures all required match data
- ✅ Multi-tenant architecture supports per-club settings

**Estimated Effort:** 11-16 hours for core integration, 5-10 hours for polish

---

## Phase 1: Foundation (2-3 hours)

### Type Definitions
- [ ] Add `duprPlayerId?: string` to Player interface in `/src/lib/types.ts`
- [ ] Add `duprVerified?: boolean` to Player interface
- [ ] Add `duprSync` metadata object to Game interface with fields:
  - [ ] `status: 'not_synced' | 'pending' | 'synced' | 'failed'`
  - [ ] `duprMatchId?: string`
  - [ ] `submittedAt?: string`
  - [ ] `lastAttempt?: string`
  - [ ] `attempts?: number`
  - [ ] `error?: string`
- [ ] Create `DuprMatchSubmission` interface for API payloads
- [ ] Create `DuprApiConfig` interface

### Core API Client
- [ ] Create `/src/lib/dupr-api.ts` file
- [ ] Implement `submitMatchToDupr()` function
  - [ ] Validate all players have DUPR IDs
  - [ ] Transform game to DUPR format
  - [ ] POST to DUPR API with authentication
  - [ ] Handle response and errors
- [ ] Implement `transformGameToDuprFormat()` helper
  - [ ] Determine winner/loser teams
  - [ ] Map player IDs to DUPR IDs
  - [ ] Format scores correctly
  - [ ] Include timestamps and optional metadata
- [ ] Implement `verifyDuprPlayerId()` function
  - [ ] GET request to DUPR player endpoint
  - [ ] Return validation result with player name

### Environment Configuration
- [ ] Add to `.env.local`:
  - [ ] `DUPR_API_ENDPOINT=https://api.dupr.gg/v1`
  - [ ] `DUPR_API_KEY=your_key_here`
  - [ ] `DUPR_ORGANIZATION_ID=optional_org_id`
- [ ] Add to `.env.local.example` for documentation

### Testing
- [ ] Write unit tests for `transformGameToDuprFormat()`
- [ ] Test with various game scenarios (singles, doubles, draws)
- [ ] Verify winner/loser logic is correct

---

## Phase 2: Player ID Linking (2-3 hours)

### Server Actions
- [ ] Create `/src/app/integrations/dupr/actions.ts` file
- [ ] Implement `linkDuprPlayerAction()` server action
  - [ ] Authenticate user
  - [ ] Check permissions (`canManagePlayers`)
  - [ ] Get DUPR config for club
  - [ ] Verify DUPR ID with API
  - [ ] Update player record in Firestore
  - [ ] Revalidate cache
- [ ] Implement `getDuprConfigForClub()` helper
  - [ ] Fetch club settings from Firestore
  - [ ] Fall back to environment variables
  - [ ] Return config object

### UI Component
- [ ] Create `/src/app/settings/dupr-settings.tsx` component
- [ ] Add form with DUPR ID input field
- [ ] Add "Link DUPR Account" button
- [ ] Show loading state during verification
- [ ] Display success message with verified player name
- [ ] Display error messages for invalid IDs
- [ ] Show current DUPR ID if already linked

### Settings Page Integration
- [ ] Update `/src/app/settings/page.tsx`
- [ ] Import and render `<DuprSettings />` component
- [ ] Position appropriately in settings layout

### Player Profile Updates
- [ ] Show DUPR badge/icon on player profiles when linked
- [ ] Display DUPR Player ID in player details
- [ ] Add "Verify DUPR ID" indicator (green checkmark)

---

## Phase 3: Match Submission (3-4 hours)

### Server Actions (continued)
- [ ] Implement `submitGameToDuprAction()` in `/src/app/integrations/dupr/actions.ts`
  - [ ] Authenticate user
  - [ ] Check permissions (`canLogGames`)
  - [ ] Fetch game from Firestore
  - [ ] Validate game belongs to club
  - [ ] Get DUPR config
  - [ ] Fetch all player records
  - [ ] Update game status to `pending`
  - [ ] Call `submitMatchToDupr()`
  - [ ] Update game status based on result (`synced` or `failed`)
  - [ ] Revalidate cache

### Post-Game Creation Hook
- [ ] Update `/src/app/log-game/actions.ts`
- [ ] After successful game creation (after `batch.commit()`):
  - [ ] Get DUPR config for club
  - [ ] Check if DUPR API key is configured
  - [ ] Queue DUPR submission asynchronously
  - [ ] Don't block game creation on DUPR submission
  - [ ] Log errors without failing game creation

### Sync Status Tracking
- [ ] Initialize `duprSync.status = 'not_synced'` for new games
- [ ] Update status to `pending` when submission starts
- [ ] Update to `synced` on success with DUPR match ID
- [ ] Update to `failed` on error with error message
- [ ] Increment `attempts` counter on each submission

### Error Handling
- [ ] Catch network errors and return descriptive messages
- [ ] Handle DUPR API errors (4xx, 5xx responses)
- [ ] Validate that all players have DUPR IDs before submission
- [ ] Handle missing DUPR configuration gracefully

### Retry Logic
- [ ] Implement exponential backoff for retries
- [ ] Maximum 5 retry attempts
- [ ] Track last attempt timestamp
- [ ] Queue failed submissions for later retry

---

## Phase 4: Admin Dashboard (2-3 hours)

### Sync Status Views
- [ ] Create admin page at `/src/app/admin/dupr-sync/page.tsx`
- [ ] Show sync statistics:
  - [ ] Total games logged
  - [ ] Games synced to DUPR
  - [ ] Games pending submission
  - [ ] Failed submissions
  - [ ] Player DUPR ID completion rate

### Failed Submissions Management
- [ ] Display list of failed game submissions
- [ ] Show error messages for each failure
- [ ] Show number of retry attempts
- [ ] Add "Retry" button for manual retry
- [ ] Add "Retry All" button for bulk retry

### Bulk Operations
- [ ] Create UI for bulk historical game sync
- [ ] Filter games by date range
- [ ] Select games to sync
- [ ] Show progress bar during bulk submission
- [ ] Display results summary (success/failure counts)
- [ ] Rate limit bulk submissions to avoid API throttling

### Club DUPR Configuration
- [ ] Add DUPR settings section to club settings page
- [ ] Allow club admins to configure:
  - [ ] DUPR API key (override global default)
  - [ ] DUPR organization ID
  - [ ] Enable/disable automatic submission
- [ ] Add "Test Connection" button
- [ ] Show connection status indicator

---

## Phase 5: Testing & Polish (2-3 hours)

### DUPR Sandbox Testing
- [ ] Set up DUPR sandbox/test API credentials
- [ ] Submit test matches
- [ ] Verify matches appear in DUPR system
- [ ] Check that DUPR match IDs are returned correctly
- [ ] Confirm rating calculations work as expected

### Error Handling Edge Cases
- [ ] Test with invalid API key
- [ ] Test with network timeout
- [ ] Test with partial player DUPR IDs (2/4 players)
- [ ] Test with invalid DUPR player ID
- [ ] Test with malformed game data
- [ ] Test rate limiting scenarios

### Rate Limiting & Backoff
- [ ] Implement request queuing
- [ ] Add exponential backoff (1s, 2s, 4s, 8s, 16s)
- [ ] Handle 429 Too Many Requests responses
- [ ] Add delay between bulk submissions
- [ ] Monitor API usage to stay within limits

### Documentation
- [ ] Add README section explaining DUPR integration
- [ ] Document how to get DUPR API credentials
- [ ] Explain player ID linking process
- [ ] Document troubleshooting steps
- [ ] Add screenshots of DUPR settings UI

### User Notifications
- [ ] Toast notification on successful DUPR submission
- [ ] Warning notification when players missing DUPR IDs
- [ ] Error notification on submission failure
- [ ] Email notification for club admins on sync issues (optional)

---

## Security & Permissions

### Firestore Security Rules
- [ ] Update `/firestore.rules` for club DUPR settings
- [ ] Allow only club admins to update `duprSettings` field
- [ ] Ensure `duprSettings.apiKey` is write-only (never readable by clients)
- [ ] Validate that DUPR-related fields follow proper schema

### API Key Security
- [ ] Never expose API keys in client-side code
- [ ] Store API keys in environment variables
- [ ] Allow per-club API key overrides (admin-only access)
- [ ] Encrypt API keys at rest in Firestore
- [ ] Implement key rotation capability

### Permission Checks
- [ ] Only club admins can configure DUPR settings
- [ ] Players can link their own DUPR IDs
- [ ] Game creators can submit their games to DUPR
- [ ] Viewers cannot submit matches
- [ ] Audit log for DUPR configuration changes

### Data Privacy
- [ ] DUPR submission is opt-in (players must link DUPR ID)
- [ ] Clear documentation of what data is shared with DUPR
- [ ] Players can unlink their DUPR ID
- [ ] Games with missing DUPR IDs are skipped automatically
- [ ] Add privacy policy section for DUPR integration

---

## Additional Features (Future Phases)

### Bi-directional Sync (Phase 2)
- [ ] Import DUPR ratings back to PBstats
- [ ] Sync rating updates from DUPR
- [ ] Show DUPR rating history timeline
- [ ] Detect rating divergence between systems
- [ ] Allow manual rating sync

### Tournament Integration (Phase 2)
- [ ] Submit entire tournament to DUPR as event
- [ ] Link PBstats tournament ID to DUPR event ID
- [ ] Sync tournament bracket structure
- [ ] Bulk submit all tournament matches
- [ ] Show DUPR event link on tournament page

### Real-time Updates (Phase 3)
- [ ] Create webhook receiver for DUPR notifications
- [ ] Handle DUPR rating update webhooks
- [ ] Push notification when DUPR match verified
- [ ] Live sync status updates in UI
- [ ] WebSocket connection for real-time sync monitoring

### Advanced Analytics (Phase 3)
- [ ] Compare PBstats ratings vs DUPR ratings
- [ ] Chart showing rating convergence over time
- [ ] Identify rating discrepancies
- [ ] Predict DUPR rating changes
- [ ] Show DUPR vs internal rating deltas

### Club Leaderboards (Phase 3)
- [ ] Display DUPR leaderboard for club
- [ ] Show DUPR rankings alongside internal rankings
- [ ] Track DUPR rating changes over time
- [ ] Filter by skill level/division
- [ ] Compare club averages to regional/national

---

## Known Constraints & Considerations

### DUPR API Limitations
- Rate limits: ~100 requests/minute (verify with DUPR docs)
- Authentication: Bearer token required
- Match validation: DUPR may reject duplicate or invalid matches
- Player verification: DUPR IDs must exist in their system

### Data Mapping
- Internal Firebase UID → DUPR Player ID mapping required
- No automatic player matching (manual linking required)
- Different naming conventions may cause confusion
- Tournament IDs optional but recommended

### User Adoption
- Requires players to know and enter their DUPR IDs
- Some players may not have DUPR accounts
- Mixed teams (DUPR + non-DUPR players) cannot sync
- Clear communication needed about benefits

### Technical Debt
- No existing HTTP client library (will use native fetch)
- No webhook infrastructure currently
- No background job queue (will implement basic retry logic)
- No existing API integration patterns to follow

---

## Pre-requisites Before Starting

### External Requirements
- [ ] Obtain DUPR API access credentials
- [ ] Review DUPR API documentation
- [ ] Understand DUPR's match submission requirements
- [ ] Confirm DUPR's rate limits and quotas
- [ ] Set up DUPR sandbox/test environment
- [ ] Verify DUPR supports club/organization-level submissions

### Technical Setup
- [ ] Ensure Next.js Server Actions are working correctly
- [ ] Verify Firebase Admin SDK permissions
- [ ] Confirm environment variable handling works
- [ ] Test current rating calculation accuracy

### Communication
- [ ] Inform club admins about upcoming DUPR integration
- [ ] Create guide for players to find their DUPR IDs
- [ ] Prepare FAQs about DUPR integration
- [ ] Set expectations about opt-in nature

---

## Success Metrics

### Technical Metrics
- [ ] 95%+ successful submission rate
- [ ] Average submission time < 2 seconds
- [ ] Zero failed submissions due to bugs
- [ ] API rate limits never exceeded

### User Adoption Metrics
- [ ] 50%+ of active players link DUPR IDs within 1 month
- [ ] 80%+ of games with full DUPR coverage auto-submit
- [ ] <5% manual retry rate
- [ ] Positive feedback from club admins

### Business Value
- [ ] Reduces manual DUPR entry burden
- [ ] Increases DUPR participation
- [ ] Enhances club's value proposition
- [ ] Provides additional rating validation

---

## Timeline & Milestones

**Week 1:**
- Complete Phase 1 (Foundation) & Phase 2 (Player ID Linking)
- Milestone: Players can link DUPR IDs

**Week 2:**
- Complete Phase 3 (Match Submission)
- Milestone: Games automatically submit to DUPR

**Week 3:**
- Complete Phase 4 (Admin Dashboard) & Phase 5 (Testing)
- Milestone: Full DUPR integration live

**Week 4:**
- Monitor, fix bugs, improve UX
- Milestone: Stable production deployment

---

## Questions to Answer

- [ ] What is DUPR's exact API endpoint structure?
- [ ] How does DUPR handle duplicate match submissions?
- [ ] What is the format for DUPR player IDs?
- [ ] Does DUPR require event/tournament pre-registration?
- [ ] How does DUPR validate match scores?
- [ ] What happens if a match is rejected by DUPR?
- [ ] Can we retrieve DUPR match verification status?
- [ ] Does DUPR support sandbox/test environments?
- [ ] What are DUPR's rate limits per API key?
- [ ] Can we get webhooks for match verification?

---

## References

- **DUPR Website:** https://dupr.gg
- **DUPR API Docs:** (To be obtained with API access)
- **PBstats Rating System:** `/src/app/log-game/actions.ts` (lines 59-161)
- **Game Data Model:** `/src/lib/types.ts` (lines 28-46)
- **Existing Server Actions Pattern:** `/src/app/events/actions.ts`

---

**Status:** Planning Complete - Ready for Implementation
**Last Updated:** 2026-02-09
**Next Step:** Obtain DUPR API credentials and begin Phase 1
