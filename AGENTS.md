<claude-mem-context>
# Memory Context

# [expo-media-viewer] recent context, 2026-04-22 4:33pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (17,870t read) | 584,359t work | 97% savings

### Apr 21, 2026
S7 Fix React Native runtime errors (ExceptionsManager ordering, property not writable, default of undefined) after clean rebuild in expo-media-viewer monorepo (Apr 21 at 8:46 PM)
S9 Rename Expo example app from "example" to "example-media-viewer" (Apr 21 at 8:50 PM)
S13 Reverted to "file:.." dependency — workspace:* approach abandoned, postinstall symlink is the final strategy (Apr 21 at 8:59 PM)
S14 Research how nandorojo/galeria and mrousavy/react-native-mmkv structure their example apps to consume the parent library — to inform expo-media-viewer's monorepo setup (Apr 21 at 9:14 PM)
S22 Rebuild expo-media-viewer example app with expo-router and multi-screen demo showcase (Apr 21 at 9:17 PM)
S23 Install missing react-native-worklets peer dependency for reanimated 4 before iOS native rebuild (Apr 21 at 9:40 PM)
S24 expo-media-viewer example app: Metro bundler fails resolving expo-linking from bun-hoisted expo-router (Apr 21 at 9:40 PM)
S25 expo-media-viewer example masonry.tsx: grid photos now clickable after removing View wrapper anti-pattern (Apr 21 at 9:42 PM)
S27 masonry.tsx: tile sizing and grid gap fully migrated to GAP constant (Apr 21 at 9:48 PM)
S29 expo-media-viewer photo tap broken: no JS onPress bridge in old architecture (Apr 21 at 10:08 PM)
118 10:35p 🔴 iOS pod deployment target mismatch fixed via post-prebuild patch script
119 " 🔵 iOS pod deployment target patch confirmed successful: all targets now 15.1
120 " 🔵 bun x tsc fails with PermissionDenied on tempdir in this environment
121 10:36p 🔴 MediaViewerView.swift: recursive UIImageView search fixes click-to-open not working
122 10:37p ⚖️ Pod deployment target patch script approach abandoned; scripts directory removed
123 " 🔴 iOS deployment target mismatch fixed via expo-build-properties plugin in app.json
124 10:38p 🔵 expo-build-properties does NOT patch SDWebImage resource bundle deployment target
125 " 🔴 Custom Expo config plugin created to patch ALL pod deployment targets via Podfile post_install hook
126 10:39p 🔵 Custom Podfile post_install hook successfully patches SDWebImage deployment target: no 9.0 entries remain
127 10:40p 🔵 expo run:ios fails in non-interactive CI-like environment: Simulator not found and port 8081 occupied
128 10:41p 🔵 CoreSimulatorService crashes in sandbox environment; xcodebuild cannot reach iOS Simulator
129 10:42p 🔵 xcodebuild compilation confirmed working with ios15.1-simulator target; no deployment mismatch error
130 10:45p 🔵 xcodebuild compilation progressing cleanly at ios15.1-simulator target
131 10:49p 🔵 SDWebImage pod now compiles cleanly at ios15.1-simulator — deployment target fix confirmed
132 10:50p 🔵 Concurrent xcodebuild instances lock build.db — parallel runs must be avoided
133 10:51p 🔵 xcodebuild session 31520 completed before kill attempt — processes self-terminated
134 10:52p 🔴 MediaViewerView.swift: RCTIsNewArchEnabled() replaced with #if RCT_NEW_ARCH_ENABLED compile-time macro
135 10:53p 🔴 expo-media-viewer iOS example BUILD SUCCEEDED — both deployment target and Swift fixes confirmed working
136 10:57p 🔵 expo-media-viewer: PlayOverlay uses pointerEvents="none" — tap-through intended
137 10:58p 🔵 expo-image ImageView.swift: SDAnimatedImageView with no explicit isUserInteractionEnabled
138 10:59p 🔴 UIImageView_Extensions.swift: tapView parameter added to redirect gesture recognizer to a non-UIImageView target
139 " 🔴 MediaViewerView.swift: recursive findImageView + mountChildComponentView added for New Arch tap fix
140 11:00p 🔵 xcodebuild fails: folly/Exception.h not found in ReactNativeDependencies pod
141 " 🔵 expo-media-viewer example: xcworkspace path is example/ios/examplemediaviewer.xcworkspace
143 11:01p 🔵 xcodebuild locked build DB: concurrent build already running from Expo dev tools
144 11:06p 🔵 expo-media-viewer: two active bugs identified — tap-to-open broken + iOS build failure
145 11:07p 🔴 MediaViewerView.swift: added layoutSubviews override to ensure image view setup
146 11:08p 🔴 UIImageView_Extensions.swift: tap gesture recognizer fixed for simultaneous recognition
147 11:09p 🔵 expo-media-viewer example app: two open issues identified
148 11:13p 🔴 UIImageView_Extensions.swift: tap recognizer delegate fixed from self to _tapRecognizer
149 11:19p 🔴 expo-media-viewer iOS tap-to-open fix: tapView parameter + delegate self-reference pattern
150 " 🔵 expo-image v55 internal structure: SDAnimatedImageView nested inside ExpoView wrapper
151 11:20p 🔵 expo-media-viewer monorepo refactor: packages/ files not yet committed to git HEAD
152 11:21p 🔄 UIImageView_Extensions.swift: extracted presentImageViewer() public method from showImageViewer()
153 " 🔄 MediaViewerView.swift: tap gesture moved from UIImageView setup to MediaViewerView itself
154 11:22p 🔴 MediaViewerView.swift: hitTest override ensures tap lands on MediaViewerView, not child views
155 " 🔵 expo-media-viewer example iOS build: compiling with warnings only, no deployment mismatch error
### Apr 22, 2026
156 8:11a ✅ expo and vercel Claude Code skills installed
157 8:12a ✅ vercel-deploy skill installed to ~/.codex/skills/
158 " ✅ 12 Expo skills installed globally via `bunx skills add expo/skills`
159 8:13a ✅ 7 Vercel agent skills installed globally via `npx skills add vercel-labs/agent-skills`
160 " ✅ 4 Software Mansion skills installed globally via `npx skills add software-mansion-labs/skills`
161 " 🔵 expo-media-viewer iOS tap architecture: UIImageView_Extensions TapWithDataRecognizer on child UIImageView
162 " 🔵 expo-media-viewer Android tap architecture: onLayout recursive ImageView traversal with setOnClickListener
163 8:14a 🔴 UIImageView_Extensions.swift: tap gesture moved from UIImageView to tapView (MediaViewerView) via new tapView parameter
164 8:15a 🔴 MediaViewerView.swift unmountChildComponentView: targeted gesture cleanup via removeImageViewerTapGesture(from:)
165 " 🔵 expo-media-viewer example app dependency stack: expo 55, RN 0.83.2, Reanimated 4.2.1, Gesture Handler 2.30
166 8:16a 🔴 MediaViewerView.ios.tsx / .android.tsx: {...props} spread moved to start to prevent overriding computed prop values
167 8:17a 🔴 Android MediaViewerView.kt: wrapper click listener added on ExpoView itself, mirroring iOS tapView fix
168 " 🔵 UIImageView_Extensions.swift: stale TapWithDataRecognizer invalidated when sourceImageView doesn't match self

Access 584k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>