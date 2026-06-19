import { requireNativeModule, requireNativeView } from "expo";
import type React from "react";
import { StyleSheet, View } from "react-native";

/**
 * Shared (iOS + Android) host for custom fullscreen-viewer overlays.
 *
 * The overlay's React content is mounted in the normal RN tree but kept
 * visually hidden and non-interactive (the wrapper is `opacity: 0` /
 * `pointerEvents: none`). When the fullscreen viewer opens, the native side
 * looks the host up by `groupId` + `placement` and reparents it into the
 * viewer; on dismiss it is returned here. Because the React content stays
 * mounted the whole time, state, gestures and re-renders keep working while
 * it is reparented.
 *
 * This file is only imported by `MediaViewerView.ios.tsx` /
 * `MediaViewerView.android.tsx`, so the native lookups never run on web.
 */

type NativeOverlayProps = {
  groupId: string;
  placement: MediaViewerOverlayPlacement;
  style?: object;
  children: React.ReactNode;
};

export type MediaViewerOverlayPlacement = "header" | "footer";

const NativeMediaViewerOverlay = requireNativeView<NativeOverlayProps>(
  "MediaViewer",
  "MediaViewerOverlayView",
);

const MediaViewerNativeModule = requireNativeModule("MediaViewer");

/** Dismisses the currently presented fullscreen viewer with its standard animation. */
export function dismissMediaViewer() {
  MediaViewerNativeModule.dismiss();
}

export function MediaViewerOverlayHost({
  groupId,
  placement,
  children,
}: {
  groupId: string;
  placement: MediaViewerOverlayPlacement;
  children: React.ReactNode;
}) {
  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <NativeMediaViewerOverlay groupId={groupId} placement={placement} style={styles.host}>
        {children}
      </NativeMediaViewerOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  host: {
    width: "100%",
  },
});
