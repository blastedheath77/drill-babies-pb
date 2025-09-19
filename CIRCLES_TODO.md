# Circles System Implementation Todo List

## Overview
Implement a simple player grouping system for filtering stats. No invitations, permissions, or complex flows. Players can belong to multiple circles. Circles are used purely for filtering players on stats pages.

**Note**: Firebase collections related to circles have been manually removed from the database.

---

## Phase 1: Core Data Structure & Backend

### 1.1 Type Definitions
- [ ] Add `Circle` interface to `/src/lib/types.ts`
  - id: string
  - name: string
  - description?: string
  - playerIds: string[]
  - createdDate: string
  - createdBy: string

### 1.2 Data Layer Functions
- [ ] Create `/src/lib/circles.ts` with functions:
  - [ ] `getCircles()` - Fetch all circles from Firestore
  - [ ] `getCircleById(id: string)` - Get single circle by ID
  - [ ] `createCircle(data: Omit<Circle, 'id'>)` - Create new circle
  - [ ] `updateCircle(id: string, data: Partial<Circle>)` - Update circle
  - [ ] `deleteCircle(id: string)` - Delete circle and cleanup
  - [ ] `getCirclesForPlayer(playerId: string)` - Get circles containing specific player
  - [ ] Error handling and validation for all functions

### 1.3 React Query Integration
- [ ] Create `/src/hooks/use-circles.ts` following existing patterns:
  - [ ] Define circle query keys for cache management
  - [ ] `useCircles()` - Query all circles with caching/refetching
  - [ ] `useCircle(id: string)` - Query single circle by ID
  - [ ] `useCreateCircle()` - Mutation for creating circles
  - [ ] `useUpdateCircle()` - Mutation for updating circles
  - [ ] `useDeleteCircle()` - Mutation for deleting circles
  - [ ] `useCirclesForPlayer(playerId: string)` - Query circles for specific player
  - [ ] Cache invalidation helpers (`useInvalidateCircles`)
  - [ ] Optimistic update helpers if needed

---

## Phase 2: Navigation & Routing

### 2.1 Navigation Integration
- [ ] Update `/src/config/nav-items.ts`:
  - [ ] Import Users icon from lucide-react
  - [ ] Add Circles nav item to mainNavItems array
  - [ ] Set properties: category: 'main', priority: 'tertiary', href: '/circles'
  - [ ] Configure mobile/desktop visibility and descriptions

### 2.2 Page Structure
- [ ] Create `/src/app/circles/` directory
- [ ] Create `/src/app/circles/page.tsx` - Main circles page (server component)
- [ ] Create `/src/app/circles/circles-client.tsx` - Client component for circles list

---

## Phase 3: Circle Management UI

### 3.1 Main Circles Page Components
- [ ] Design and implement circles list view:
  - [ ] Card-based layout showing circle name, description, player count
  - [ ] "Create New Circle" button prominently displayed
  - [ ] Edit/Delete actions for each circle
  - [ ] Empty state when no circles exist
  - [ ] Loading states with skeleton components
  - [ ] Error handling with retry functionality

### 3.2 Circle Form Dialog
- [ ] Create `/src/components/circle-form-dialog.tsx`:
  - [ ] Reusable for both create and edit modes
  - [ ] Form fields: name (required), description (optional)
  - [ ] Multi-select player picker with checkboxes
  - [ ] Search/filter functionality for players
  - [ ] Form validation (name required, unique names)
  - [ ] Save/Cancel actions with loading states
  - [ ] Success/error feedback

### 3.3 Delete Circle Dialog
- [ ] Create `/src/components/delete-circle-dialog.tsx`:
  - [ ] Follow existing delete-tournament-dialog pattern
  - [ ] Confirmation dialog with circle name
  - [ ] Warning about losing filtering capabilities
  - [ ] List affected players for context
  - [ ] Proper error handling and loading states

### 3.4 Player Selection Components
- [ ] Create `/src/components/circle-player-selector.tsx`:
  - [ ] Multi-select component with checkboxes
  - [ ] Search/filter players by name
  - [ ] Show player avatars and current ratings
  - [ ] Select all/none functionality
  - [ ] Display selected count
  - [ ] Responsive design for mobile

---

## Phase 4: Filtering Integration

### 4.1 Circle Selector Component
- [ ] Create `/src/components/circle-selector.tsx`:
  - [ ] Dropdown/select component showing all circles
  - [ ] "All Players" as default option
  - [ ] Show player count for each circle
  - [ ] Handle loading and error states
  - [ ] Responsive design
  - [ ] Clear selection functionality

### 4.2 Rankings Page Integration
- [ ] Update `/src/app/statistics/statistics-client.tsx`:
  - [ ] Add circle selector above existing player count badge
  - [ ] Filter playersData array by selected circle's playerIds
  - [ ] Maintain "All Players" as default view
  - [ ] Update player count badge to reflect filtered count
  - [ ] Preserve existing functionality when no filter applied
  - [ ] Add URL state persistence for selected circle (optional)

### 4.3 Header Integration (Optional Enhancement)
- [ ] Consider adding circle selector to header for global filtering:
  - [ ] Update `/src/components/layout/header.tsx`
  - [ ] Add compact circle selector
  - [ ] Global state management for circle filter
  - [ ] Apply filtering across multiple pages

---

## Phase 5: Testing & Polish

### 5.1 Functionality Testing
- [ ] Test circle creation with various player selections
- [ ] Test circle editing (add/remove players, change name/description)
- [ ] Test circle deletion and proper cleanup
- [ ] Test filtering on Rankings page with different circles
- [ ] Test edge cases (empty circles, all players in circle, etc.)
- [ ] Test mobile responsiveness across all components

### 5.2 Error Handling & Edge Cases
- [ ] Handle network errors gracefully
- [ ] Validate circle names are unique
- [ ] Handle circles with deleted players
- [ ] Graceful degradation when Firebase is unavailable
- [ ] Loading states for all async operations
- [ ] Proper error messages for users

### 5.3 Performance Optimization
- [ ] Ensure proper React Query caching
- [ ] Optimize player selection component for large player lists
- [ ] Minimize re-renders in filtering components
- [ ] Test with realistic data volumes

### 5.4 UI/UX Polish
- [ ] Consistent styling with existing design system
- [ ] Proper focus management in dialogs
- [ ] Keyboard navigation support
- [ ] Loading spinners and transitions
- [ ] Success feedback for user actions
- [ ] Tooltips and help text where needed

---

## Phase 6: Future Considerations (Not Implemented Initially)

### 6.1 Additional Filtering Integration
- [ ] Add circle filtering to other pages:
  - [ ] Players page
  - [ ] Games page
  - [ ] Partnerships page
  - [ ] Head-to-Head page

### 6.2 Advanced Features (Optional)
- [ ] Circle color coding/themes
- [ ] Circle statistics and analytics
- [ ] Bulk player management (import/export)
- [ ] Circle templates or presets
- [ ] Advanced search and sorting

---

## Implementation Notes

### Technical Considerations
- Follow existing codebase patterns (React Query, shadcn/ui, TypeScript)
- Maintain consistency with current Firebase data patterns
- Use existing error handling and logging utilities
- Follow mobile-first responsive design principles
- Ensure proper TypeScript typing throughout

### Database Structure
- Circles will be stored in a new `circles` collection in Firestore
- Each circle document contains playerIds array for simple relationship management
- No complex relational queries needed - keep it simple

### Security Considerations
- Circles are public within the app (no permissions needed)
- Anyone can create, edit, or delete circles (admin-only restrictions can be added later if needed)
- No sensitive data stored in circles (just names, descriptions, player references)

---

## Dependencies
- No new external dependencies required
- Uses existing Firebase, React Query, shadcn/ui, Lucide React icons
- Follows current TypeScript and Tailwind CSS patterns