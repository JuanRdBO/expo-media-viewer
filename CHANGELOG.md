# expo-media-viewer

## 0.1.1

### Patch Changes

- c4c903c: Share expo-image cache with native viewer for instant image loading on tap (iOS: SDWebImage shared cache + URLCache fallback, Android: explicit Glide cache strategy + thumbnail placeholder). Prefetch adjacent pages on iOS swipe.
