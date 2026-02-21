# Story 16: Progressive Web App (PWA)

**Priority:** Medium  
**Phase:** 4 - Polish & API  
**Estimate:** 2-3 days  
**Dependencies:** Story 11

## Story

As a mobile user, I want to install the app on my home screen so that I can access it like a native app.

## Acceptance Criteria

### Web App Manifest
- [ ] Manifest file at `/manifest.json`
- [ ] Required fields:
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
- [ ] Icons in multiple sizes:
  - 48x48 (favicon)
  - 72x72
  - 96x96
  - 128x128
  - 144x144
  - 152x152 (iOS)
  - 192x192 (manifest)
  - 384x384
  - 512x512 (splash screen)
- [ ] PNG format
- [ ] Transparent or solid background
- [ ] App logo or icon

### Service Worker (from Story 11)
- [ ] Registered and functional
- [ ] Caches static assets
- [ ] Works offline
- [ ] Background sync

### Responsive Design
- [ ] Mobile-first CSS
- [ ] Works on all screen sizes
- [ ] Touch-friendly targets (min 44px)
- [ ] No horizontal scroll on mobile
- [ ] Readable font sizes

### iOS Specific
- [ ] Apple touch icon:
  ```html
  <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png">
  ```
- [ ] iOS status bar style:
  ```html
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  ```
- [ ] iOS standalone mode:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  ```
- [ ] iOS splash screen images (optional)

### Android Specific
- [ ] Theme color in meta tag:
  ```html
  <meta name="theme-color" content="#4F46E5">
  ```
- [ ] Manifest linked:
  ```html
  <link rel="manifest" href="/manifest.json">
  ```

### Installation Prompt
- [ ] Install button or prompt (optional)
- [ ] Instructions for manual install
- [ ] Detect if already installed

### App Shell
- [ ] Shell HTML cached by service worker
- [ ] Fast first paint
- [ ] Progressive loading of content

### Performance
- [ ] Lighthouse PWA audit score > 90
- [ ] Fast load on slow networks
- [ ] Smooth animations

### Testing
- [ ] Test on Android Chrome
- [ ] Test on iOS Safari
- [ ] Test add to home screen
- [ ] Test offline mode
- [ ] Verify icons appear correctly

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
- [ ] Service worker registered
- [ ] Manifest valid
- [ ] Icons present
- [ ] Works offline
- [ ] Responsive
- [ ] Page load fast enough

## Dependencies

- Story 11: Offline Mode (includes service worker)

## Definition of Done

- [ ] Manifest valid and complete
- [ ] All icon sizes provided
- [ ] Service worker registered
- [ ] App installable on mobile
- [ ] Works offline
- [ ] Responsive on all devices
- [ ] Lighthouse PWA score > 90
- [ ] Tested on iOS and Android
