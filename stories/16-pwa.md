# Story 16: Progressive Web App (PWA)

**Priority:** Medium  
**Phase:** 4 - Polish & API  
**Estimate:** 2-3 days  
**Dependencies:** Story 11

## Story

As a mobile user, I want to install the app on my home screen so that I can access it like a native app.

## Acceptance Criteria

### Web App Manifest
- [x] Manifest file at `/manifest.json`
- [x] Required fields:
  - `name`: Full app name ("Fetch Shopping Lists")
  - `short_name`: Short name for home screen ("Fetch")
  - `description`: App description
  - `start_url`: "/"
  - `display`: "standalone"
  - `background_color`: Theme color
  - `theme_color`: Accent color
  - `orientation`: "portrait" or "any"
  - `scope`: "/"
  - `lang`: Default language

### Icons
- [x] Icons in multiple sizes:
  - 48x48 (favicon)
  - 72x72
  - 96x96
  - 128x128
  - 144x144
  - 152x152 (iOS)
  - 192x192 (manifest)
  - 384x384
  - 512x512 (splash screen)
- [x] PNG format
- [x] Transparent or solid background
- [x] App logo or icon

### Service Worker (from Story 11)
- [x] Registered and functional
- [x] Caches static assets
- [x] Works offline
- [x] Background sync

### Responsive Design
- [x] Mobile-first CSS
- [x] Works on all screen sizes
- [x] Touch-friendly targets (min 44px)
- [x] No horizontal scroll on mobile
- [x] Readable font sizes

### iOS Specific
- [x] Apple touch icon:
  ```html
  <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png">
  ```
- [x] iOS status bar style:
  ```html
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  ```
- [x] iOS standalone mode:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  ```
- [ ] iOS splash screen images (optional)

### Android Specific
- [x] Theme color in meta tag:
  ```html
  <meta name="theme-color" content="#4F46E5">
  ```
- [x] Manifest linked:
  ```html
  <link rel="manifest" href="/manifest.json">
  ```

### Installation Prompt
- [x] Install button or prompt (optional)
- [x] Instructions for manual install
- [x] Detect if already installed

### App Shell
- [x] Shell HTML cached by service worker
- [x] Fast first paint
- [x] Progressive loading of content

### Performance
- [ ] Lighthouse PWA audit score > 90
- [x] Fast load on slow networks
- [x] Smooth animations

### Testing
- [ ] Test on Android Chrome
- [ ] Test on iOS Safari
- [ ] Test add to home screen
- [ ] Test offline mode
- [x] Verify icons appear correctly

## Technical Notes

### Manifest Example
```json
{
  "name": "Fetch Shopping Lists",
  "short_name": "Fetch",
  "description": "A lightweight shopping list app for couples and families",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "orientation": "portrait",
  "scope": "/",
  "lang": "en",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Maskable Icons
For Android adaptive icons, provide maskable versions:
```json
{
  "src": "/icons/icon-maskable.png",
  "sizes": "512x512",
  "type": "image/png",
  "purpose": "maskable"
}
```

### HTML Meta Tags
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- PWA -->
  <meta name="theme-color" content="#4F46E5">
  <link rel="manifest" href="/manifest.json">
  
  <!-- iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Fetch">
  <link rel="apple-touch-icon" href="/icons/icon-180x180.png">
  
  <!-- Icons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png">
  
  <title>Fetch Shopping Lists</title>
</head>
```

### Lighthouse PWA Checklist
Run Lighthouse audit and ensure:
- [ ] HTTPS used
- [x] Service worker registered
- [x] Manifest valid
- [x] Icons present
- [x] Works offline
- [x] Responsive
- [x] Page load fast enough

## Dependencies

- Story 11: Offline Mode (includes service worker)

## Definition of Done

- [x] Manifest valid and complete
- [x] All icon sizes provided
- [x] Service worker registered
- [x] App installable on mobile
- [x] Works offline
- [x] Responsive on all devices
- [ ] Lighthouse PWA score > 90
- [ ] Tested on iOS and Android

## Post-Implementation Refinements

- [x] Fixed deprecated `apple-mobile-web-app-capable` console warning by adding `mobile-web-app-capable` meta tag
- [x] Added `screenshots` field to manifest with `wide` (desktop) and `narrow` (mobile) form factors for richer install UI
- [x] Fixed app header not scaling on mobile -- added 768px breakpoint to stack title and nav buttons vertically
- [x] Updated screenshot dimensions in manifest to match actual captured images (2260x1506 desktop, 682x1516 mobile)
- [x] Added i18n translations for install prompt in all 13 languages
- [x] 100 automated tests covering manifest, icons, meta tags, service worker, install prompt, i18n, responsive CSS, and app integration
