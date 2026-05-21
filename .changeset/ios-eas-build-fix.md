---
"expo-media-viewer": patch
---

Fix iOS EAS builds that compiled the media viewer without the React Native new architecture Swift flag by using UIKit child view lifecycle hooks instead of React architecture-specific subview APIs.
