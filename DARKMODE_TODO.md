# Dark Mode Implementation TODO

## Overview
Implement a comprehensive dark mode feature with a toggle switch in the main pull-out menu. The application already has Tailwind CSS configured for class-based dark mode and dark theme CSS variables defined.

## Phase 1: Theme Management System
- [ ] **Install next-themes package**
  - Add `next-themes` dependency for React theme management
  - Provides theme persistence, system preference detection, and hydration-safe theme switching

- [ ] **Create Theme Provider Wrapper**
  - Create `src/contexts/theme-context.tsx` to wrap next-themes ThemeProvider
  - Add theme persistence and system theme detection
  - Integrate with existing app structure

- [ ] **Update Root Layout**
  - Wrap the app with ThemeProvider in `src/app/layout.tsx`
  - Add theme suppression attributes to prevent hydration flashing
  - Ensure theme is applied to `<html>` tag for proper CSS variable inheritance

## Phase 2: Dark Mode Toggle Component
- [ ] **Create Theme Toggle Switch**
  - Build `src/components/theme-toggle.tsx` component
  - Use existing Switch UI component from `src/components/ui/switch.tsx`
  - Include icons (Sun/Moon) for visual feedback
  - Show current theme state and allow toggling between light/dark/system

- [ ] **Add Theme Toggle Hook**
  - Create `src/hooks/use-theme.ts` for theme management logic
  - Handle theme switching, persistence, and state management
  - Provide theme detection utilities

## Phase 3: Integration with Navigation
- [ ] **Update Mobile Sidebar Menu**
  - Add theme toggle switch to the existing mobile sidebar menu (`MobileSidebarMenu` in `unified-navigation.tsx`)
  - Place it in the Account section, below user info but above logout
  - Style consistently with existing menu items

- [ ] **Update Desktop Sidebar (optional)**
  - Consider adding theme toggle to desktop sidebar as well
  - Maintain consistent placement and styling

## Phase 4: Theme-Aware Components
- [ ] **Update Custom Scrollbar Styles**
  - Ensure custom scrollbar styles in `globals.css` work properly in dark mode
  - Update CSS custom properties for dark theme compatibility

- [ ] **Review Component Dark Mode Support**
  - Audit existing components for proper dark mode styling
  - Focus on components with custom backgrounds or colors:
    - Tournament cards with colored backgrounds (green, blue, purple)
    - Status badges and indicators
    - Chart components if any
    - Avatar fallbacks and borders

- [ ] **Update Color Scheme Meta Tags**
  - Add dynamic color scheme meta tag that updates with theme
  - Update PWA manifest colors for dark mode support

## Phase 5: Enhanced UX Features
- [ ] **System Theme Detection**
  - Respect user's system theme preference on first visit
  - Allow manual override with persistence

- [ ] **Smooth Transitions**
  - Add CSS transitions for theme switching
  - Prevent flash of incorrect theme during hydration

- [ ] **Theme Persistence**
  - Store theme preference in localStorage
  - Maintain theme across sessions and page reloads

## Phase 6: Testing & Polish
- [ ] **Cross-Browser Testing**
  - Test theme switching on different browsers and devices
  - Verify PWA functionality with theme changes

- [ ] **Performance Optimization**
  - Ensure theme switching doesn't cause layout shifts
  - Optimize theme detection for fast initial load

- [ ] **Accessibility**
  - Ensure theme toggle is accessible via keyboard
  - Add proper ARIA labels and descriptions
  - Test with screen readers

## File Structure
```
src/
├── contexts/
│   └── theme-context.tsx          # Theme provider wrapper
├── hooks/
│   └── use-theme.ts               # Theme management hook
├── components/
│   ├── theme-toggle.tsx           # Main theme toggle component
│   └── layout/
│       └── unified-navigation.tsx # Updated with theme toggle
├── app/
│   └── layout.tsx                 # Updated with theme provider
└── styles/
    └── globals.css                # Enhanced with theme transitions
```

## Implementation Notes
- The application already has Tailwind configured with `darkMode: ['class']`
- Dark theme CSS variables are already defined in `globals.css`
- Switch UI component already exists and can be reused
- Mobile sidebar menu structure is already in place

## Key Benefits
- ✅ **Seamless Integration**: Uses existing UI components and design system
- ✅ **Performance**: No layout shifts or hydration issues
- ✅ **Persistence**: Remembers user preference across sessions
- ✅ **System Aware**: Respects user's OS theme preference
- ✅ **Accessible**: Keyboard navigable with proper ARIA labels
- ✅ **Mobile First**: Integrated into existing mobile navigation
- ✅ **PWA Compatible**: Works with app's PWA functionality

## Implementation Estimate (Human Developer Time)
- **Phase 1-2**: 2-3 hours (Core theme system)
- **Phase 3**: 1 hour (Navigation integration)
- **Phase 4-5**: 2-3 hours (Polish and UX)
- **Phase 6**: 1 hour (Testing)
- **Total**: ~6-8 hours

*Note: AI assistant implementation would be significantly faster (~15-30 minutes active work)*

## Dependencies to Add
```bash
npm install next-themes
```

## Current Theme System Status
- ✅ Tailwind dark mode configured
- ✅ CSS variables for dark theme defined
- ✅ Switch component available
- ❌ Theme provider not installed
- ❌ Theme toggle component missing
- ❌ Navigation integration pending