# PWA Testing Checklist

## Manual Testing Steps

### 1. PWA Installation Test
- [ ] Open the app in Chrome/Edge on desktop
- [ ] Look for install prompt or + icon in address bar
- [ ] Click install and verify app opens in standalone window
- [ ] Check that app icon appears in OS app launcher
- [ ] Verify app starts without browser UI

### 2. Mobile Responsive Test
- [ ] Open on mobile device or use Chrome DevTools mobile simulation
- [ ] Test all major screens: tournaments, create tournament, player selection
- [ ] Verify touch targets are at least 44px x 44px
- [ ] Check that buttons and forms work well with touch
- [ ] Confirm text is readable without zooming

### 3. Offline Functionality Test
- [ ] Go to Network tab in DevTools
- [ ] Set network to "Offline"
- [ ] Navigate around the app - cached pages should still load
- [ ] Try to create a tournament while offline
- [ ] Verify offline indicator appears
- [ ] Go back online and check if queued operations sync

### 4. Service Worker Test
- [ ] Check Application tab in DevTools
- [ ] Verify service worker is registered and active
- [ ] Check that static assets are cached
- [ ] Verify cache updates when app is updated

### 5. Manifest Test
- [ ] Check Application > Manifest tab in DevTools
- [ ] Verify all icons are loading correctly
- [ ] Check app name, description, and theme colors
- [ ] Verify shortcuts are configured properly

## Automated Testing

Run the following command to check PWA compliance:
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run PWA audit
lighthouse http://localhost:3002 --view --preset=desktop --chrome-flags="--headless"
```

## Expected Results

### Mobile Optimization ✅
- Tournament creation form is mobile-friendly
- Touch targets are appropriately sized
- Navigation works well on mobile
- Text inputs don't cause zoom on iOS
- Scrollbars are always visible where needed

### PWA Features ✅
- Service worker caches app shell and static assets
- Manifest enables installation on mobile/desktop
- Offline indicator shows connection status
- Install prompt appears for eligible browsers
- Queued operations sync when back online

### Performance
- App should load quickly on mobile networks
- Smooth animations and transitions
- Responsive layout adapts to screen sizes
- Touch interactions feel natural

## Browser Support

### Desktop
- ✅ Chrome 67+
- ✅ Edge 79+
- ✅ Firefox 68+ (limited PWA features)
- ❌ Safari (no PWA installation)

### Mobile
- ✅ Chrome Mobile 67+
- ✅ Safari iOS 11.3+ (Add to Home Screen)
- ✅ Samsung Internet 8.2+
- ✅ Edge Mobile 79+

## Troubleshooting

### Service Worker Not Registering
- Check console for registration errors
- Verify sw.js is accessible at /sw.js
- Check HTTPS requirement (localhost works for development)

### Install Prompt Not Showing
- Clear browser data and reload
- Check that manifest.json is valid
- Verify HTTPS connection
- Ensure service worker is active

### Offline Features Not Working
- Check IndexedDB is available
- Verify network intercepting in service worker
- Check offline queue implementation
- Test with actual network disconnection, not just DevTools offline