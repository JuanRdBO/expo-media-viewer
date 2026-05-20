import type { CSSProperties } from "react";

export type OriginRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

export type TransitionPhase = "opening" | "open" | "closing";

export type DragTransition = {
  x: number;
  y: number;
  active: boolean;
  settling: boolean;
};

export type ClosedMatchFrame = {
  transform: string;
  clipPath: string;
  clipRect: OriginRect;
};

export const MATCH_TRANSITION_MS = 300;
export const MATCH_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const SNAP_BACK_EASING = "cubic-bezier(0.2, 1.35, 0.28, 1)";

export function toOverlayBackgroundStyle({
  phase,
  theme,
  dragProgress,
  blurOverlay,
}: {
  phase: TransitionPhase;
  theme: "dark" | "light";
  dragProgress: number;
  blurOverlay: boolean;
}): CSSProperties {
  const openOpacity = clamp(1 - dragProgress * 1.5, 0, 1);

  return {
    position: "fixed",
    inset: 0,
    opacity: phase === "open" ? openOpacity : 0,
    background: theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.92)",
    backdropFilter: blurOverlay ? "blur(18px)" : undefined,
    WebkitBackdropFilter: blurOverlay ? "blur(18px)" : undefined,
    transition: `opacity 220ms ${MATCH_EASING}`,
  };
}

export function toMatchedContentStyle({
  phase,
  originRect,
  width,
  height,
  drag,
  backgroundColor,
}: {
  phase: TransitionPhase;
  originRect: OriginRect;
  width: number;
  height: number;
  drag: DragTransition;
  backgroundColor: string;
}): CSSProperties {
  const closedFrame = toClosedMatchFrame(originRect, width, height);
  const dragProgress = dragProgressFrom(drag, width, height);
  const dragScale = clamp(1 - dragProgress * 0.35, 0.62, 1);
  const isOpen = phase === "open";
  const transform = isOpen
    ? `translate3d(${drag.x * 0.5}px, ${drag.y * 0.5}px, 0) scale(${dragScale}) rotate(${drag.x * 0.015}deg)`
    : closedFrame.transform;
  const clipPath = isOpen ? "inset(0px 0px 0px 0px round 0px)" : closedFrame.clipPath;
  const easing = isOpen && drag.settling ? SNAP_BACK_EASING : MATCH_EASING;

  return {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: backgroundColor,
    clipPath,
    WebkitClipPath: clipPath,
    transform,
    transformOrigin: "center center",
    willChange: "transform, clip-path",
    transition: drag.active
      ? "none"
      : [
          `transform ${MATCH_TRANSITION_MS}ms ${easing}`,
          `clip-path ${MATCH_TRANSITION_MS}ms ${MATCH_EASING}`,
          `-webkit-clip-path ${MATCH_TRANSITION_MS}ms ${MATCH_EASING}`,
        ].join(", "),
  };
}

export function toClosedMatchFrame(
  originRect: OriginRect,
  width: number,
  height: number,
): ClosedMatchFrame {
  const viewportWidth = Math.max(1, width);
  const viewportHeight = Math.max(1, height);
  const rectWidth = Math.max(1, originRect.width);
  const rectHeight = Math.max(1, originRect.height);
  const scale = Math.max(rectWidth / viewportWidth, rectHeight / viewportHeight);
  const centerX = originRect.x + rectWidth / 2;
  const centerY = originRect.y + rectHeight / 2;
  const translateX = centerX - viewportWidth / 2;
  const translateY = centerY - viewportHeight / 2;
  const clipWidth = rectWidth / scale;
  const clipHeight = rectHeight / scale;
  const clipLeft = (viewportWidth - clipWidth) / 2;
  const clipTop = (viewportHeight - clipHeight) / 2;
  const clipRight = viewportWidth - clipLeft - clipWidth;
  const clipBottom = viewportHeight - clipTop - clipHeight;
  const radius = Math.min(24, rectWidth / 8) / scale;

  return {
    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
    clipPath: `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px round ${radius}px)`,
    clipRect: {
      x: clipLeft,
      y: clipTop,
      width: clipWidth,
      height: clipHeight,
    },
  };
}

export function toForegroundMatchTransform({
  phase,
  originRect,
  width,
  height,
  mediaSize,
}: {
  phase: TransitionPhase;
  originRect: OriginRect;
  width: number;
  height: number;
  mediaSize: Size | null;
}) {
  if (phase === "open" || !mediaSize || mediaSize.width <= 0 || mediaSize.height <= 0) {
    return "translate3d(0px, 0px, 0) scale(1)";
  }

  const presentedRect = fitRectIntoBounds(mediaSize, { width, height });
  const targetClipRect = toClosedMatchFrame(originRect, width, height).clipRect;
  const scale = Math.max(
    targetClipRect.width / presentedRect.width,
    targetClipRect.height / presentedRect.height,
  );
  const translationX =
    targetClipRect.x +
    targetClipRect.width / 2 -
    (presentedRect.x + presentedRect.width / 2) * scale;
  const translationY =
    targetClipRect.y +
    targetClipRect.height / 2 -
    (presentedRect.y + presentedRect.height / 2) * scale;

  return `translate3d(${translationX}px, ${translationY}px, 0) scale(${scale})`;
}

export function fitRectIntoBounds(size: Size, bounds: Size): OriginRect {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const mediaAspectRatio = size.width / size.height;
  const boundsAspectRatio = width / height;

  if (mediaAspectRatio > boundsAspectRatio) {
    const fittedHeight = width / mediaAspectRatio;
    return {
      x: 0,
      y: (height - fittedHeight) / 2,
      width,
      height: fittedHeight,
    };
  }

  const fittedWidth = height * mediaAspectRatio;
  return {
    x: (width - fittedWidth) / 2,
    y: 0,
    width: fittedWidth,
    height,
  };
}

export function toChromeOpacity(phase: TransitionPhase, dragProgress: number) {
  return phase === "open" ? clamp(1 - dragProgress * 2.2, 0, 1) : 0;
}

export function dragProgressFrom(drag: DragTransition, width: number, height: number) {
  const maxAxis = Math.max(width, height, 1);
  return (Math.abs(drag.x) / maxAxis + Math.abs(drag.y) / maxAxis) * 1.2;
}

export function makeFallbackOriginRect(width: number, height: number): OriginRect {
  const fallbackSize = Math.min(width, height, 240);
  return {
    x: Math.max(0, (width - fallbackSize) / 2),
    y: Math.max(0, (height - fallbackSize) / 2),
    width: fallbackSize,
    height: fallbackSize,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
