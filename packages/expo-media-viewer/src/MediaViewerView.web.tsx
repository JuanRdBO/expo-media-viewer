import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import type {
  MediaViewerIndexChangedEvent,
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerRenderItem,
  MediaViewerRenderItemOptions,
  MediaViewerVideoErrorEvent,
  NativeMediaViewerItem,
} from "./MediaViewer.types";
import { normalizeItems, toFrameStyle } from "./MediaViewerShared";
import {
  getWebVideoThumbnailTime,
  MediaViewerThumbnail,
  MediaViewerVideoIndicator,
  syncWebVideoThumbnailTime,
  toThumbnailKey,
  useWebMediaUri,
} from "./MediaViewerThumbnail.web";
import {
  type DragTransition,
  dragProgressFrom,
  MATCH_EASING,
  MATCH_TRANSITION_MS,
  makeFallbackOriginRect,
  type OriginRect,
  type Size,
  type TransitionPhase,
  toChromeOpacity,
  toForegroundMatchTransform,
  toMatchedContentStyle,
  toOverlayBackgroundStyle,
} from "./MediaViewerTransitionLayout.web";

type ViewerState = {
  index: number;
  originRect: OriginRect;
};

type ViewRef = React.ElementRef<typeof View>;
type MeasureOriginRect = (
  index: number,
  fallbackRect: OriginRect,
  onMeasure: (rect: OriginRect) => void,
) => void;

const DRAG_ACTIVATION_DISTANCE = 6;

function MediaViewer<TItem extends MediaViewerItem = MediaViewerItem>({
  items,
  config,
  onIndexChange,
  onVideoError,
  renderLayout,
}: MediaViewerProps<TItem>) {
  const { width, height } = useWindowDimensions();
  const frameRefs = useRef(new Map<number, ViewRef>());
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [hiddenThumbnailIndex, setHiddenThumbnailIndex] = useState<number | null>(null);
  const nativeItems = useMemo(
    () => normalizeItems(items, config?.request?.headers),
    [items, config?.request?.headers],
  );
  const itemsJson = useMemo(() => JSON.stringify(nativeItems), [nativeItems]);
  const groupId = useMemo(() => makeGroupId(itemsJson), [itemsJson]);

  const emitIndexChange = useCallback(
    (index: number) => {
      onIndexChange?.({
        nativeEvent: { currentIndex: index },
      } as MediaViewerIndexChangedEvent);
    },
    [onIndexChange],
  );

  const measureOriginRect = useCallback<MeasureOriginRect>((index, fallbackRect, onMeasure) => {
    const frame = frameRefs.current.get(index);

    if (!frame?.measureInWindow) {
      onMeasure(fallbackRect);
      return;
    }

    frame.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      onMeasure(
        measuredWidth > 0 && measuredHeight > 0
          ? { x, y, width: measuredWidth, height: measuredHeight }
          : fallbackRect,
      );
    });
  }, []);

  const openViewer = useCallback(
    (index: number) => {
      const fallbackRect = makeFallbackOriginRect(width, height);

      measureOriginRect(index, fallbackRect, (originRect) => {
        setHiddenThumbnailIndex(index);
        setViewer({ index, originRect });
        emitIndexChange(index);
      });
    },
    [emitIndexChange, height, measureOriginRect, width],
  );

  const setFrameRef = useCallback(
    (index: number) => (node: ViewRef | null) => {
      if (node) {
        frameRefs.current.set(index, node);
      } else {
        frameRefs.current.delete(index);
      }
    },
    [],
  );

  const renderItem = useCallback<MediaViewerRenderItem>(
    (index: number, itemOptions: MediaViewerRenderItemOptions = {}) => {
      const item = nativeItems[index];
      if (!item) return null;

      const fit = itemOptions.thumbnail?.fit ?? config?.thumbnail?.fit ?? "cover";
      const mode =
        itemOptions.thumbnail?.mode ??
        item.thumbnailMode ??
        config?.thumbnail?.videoMode ??
        "static";
      const showVideoIndicator =
        item.type === "video" && (itemOptions.videoIndicator ?? config?.videoIndicator ?? true);

      return (
        <View
          key={item.id}
          ref={setFrameRef(index)}
          collapsable={false}
          style={[
            toFrameStyle(itemOptions),
            hiddenThumbnailIndex === index ? { opacity: 0 } : null,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toThumbnailAccessibilityLabel(item, index)}
            onPress={() => openViewer(index)}
            style={StyleSheet.absoluteFill}
          >
            <MediaViewerThumbnail
              item={item}
              index={index}
              groupId={groupId}
              fit={fit}
              mode={mode}
              active={!viewer}
            />
            {showVideoIndicator ? <MediaViewerVideoIndicator duration={item.duration} /> : null}
            {itemOptions.overlay ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {itemOptions.overlay}
              </View>
            ) : null}
          </Pressable>
        </View>
      );
    },
    [config, groupId, hiddenThumbnailIndex, nativeItems, openViewer, setFrameRef, viewer],
  );

  return (
    <>
      {renderLayout({ items, renderItem })}
      {viewer ? (
        <WebMediaViewerOverlay
          items={nativeItems}
          initialIndex={viewer.index}
          originRect={viewer.originRect}
          measureOriginRect={measureOriginRect}
          groupId={groupId}
          config={config}
          onIndexChange={emitIndexChange}
          onVideoError={onVideoError}
          onActiveIndexChange={setHiddenThumbnailIndex}
          onClose={() => {
            setViewer(null);
            setHiddenThumbnailIndex(null);
          }}
        />
      ) : null}
    </>
  );
}

type WebMediaViewerOverlayProps = {
  items: NativeMediaViewerItem[];
  initialIndex: number;
  originRect: OriginRect;
  measureOriginRect: MeasureOriginRect;
  groupId: string;
  config: MediaViewerProps["config"];
  onIndexChange: (index: number) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
};

function WebMediaViewerOverlay({
  items,
  initialIndex,
  originRect,
  measureOriginRect,
  groupId,
  config,
  onIndexChange,
  onVideoError,
  onActiveIndexChange,
  onClose,
}: WebMediaViewerOverlayProps) {
  const { width, height } = useWindowDimensions();
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<TransitionPhase>("opening");
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [closingOriginRect, setClosingOriginRect] = useState(originRect);
  const [drag, setDrag] = useState<DragTransition>({
    x: 0,
    y: 0,
    active: false,
    settling: false,
  });
  const activeItem = items[activeIndex];
  const isCompact = width < 720;
  const theme = config?.theme ?? "dark";
  const thumbnailKey = toThumbnailKey(groupId, activeIndex);
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < items.length - 1;
  const dragProgress = dragProgressFrom(drag, width, height);

  const syncActiveVideo = useCallback(() => {
    const currentTime = activeVideoRef.current?.currentTime ?? 0;
    syncWebVideoThumbnailTime(thumbnailKey, currentTime);
  }, [thumbnailKey]);

  const close = useCallback(() => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    activeVideoRef.current?.pause();
    syncActiveVideo();
    setDrag((current) => ({ ...current, active: false, settling: false }));

    const fallbackRect =
      activeIndex === initialIndex ? originRect : makeFallbackOriginRect(width, height);

    measureOriginRect(activeIndex, fallbackRect, (rect) => {
      setClosingOriginRect(rect);
      setPhase("closing");
      closeTimerRef.current = window.setTimeout(onClose, MATCH_TRANSITION_MS);
    });
  }, [
    activeIndex,
    height,
    initialIndex,
    measureOriginRect,
    onClose,
    originRect,
    syncActiveVideo,
    width,
  ]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (phase !== "open") return;

      const boundedIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
      if (boundedIndex === activeIndex) return;
      syncActiveVideo();
      activeVideoRef.current = null;
      setDrag({ x: 0, y: 0, active: false, settling: false });
      setActiveIndex(boundedIndex);
      onActiveIndexChange(boundedIndex);
      onIndexChange(boundedIndex);
    },
    [activeIndex, items.length, onActiveIndexChange, onIndexChange, phase, syncActiveVideo],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPhase("open"));
    const unlockDocumentScroll = lockDocumentScroll();
    const preventScroll = (event: Event) => event.preventDefault();

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      window.cancelAnimationFrame(frame);
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      unlockDocumentScroll();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowLeft") {
        goTo(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        goTo(activeIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, close, goTo]);

  if (!activeItem || typeof document === "undefined") return null;

  const contentStyle = toMatchedContentStyle({
    phase,
    originRect: phase === "closing" ? closingOriginRect : originRect,
    width,
    height,
    drag,
    backgroundColor: theme === "dark" ? "#050505" : "#f8f8f8",
  });
  const backgroundStyle = toOverlayBackgroundStyle({
    phase,
    theme,
    dragProgress,
    blurOverlay: !(config?.viewer?.hideBlurOverlay ?? false),
  });
  const chromeOpacity = toChromeOpacity(phase, dragProgress);
  const chromeColor = theme === "dark" ? "#fff" : "#111";
  const subduedChromeColor = theme === "dark" ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.58)";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.title ?? "Media viewer"}
      style={styles.portalRoot}
    >
      <div style={backgroundStyle} />
      <div style={contentStyle}>
        <WebMediaStage
          key={activeItem.id}
          item={activeItem}
          index={activeIndex}
          thumbnailKey={thumbnailKey}
          compact={isCompact}
          phase={phase}
          matchOriginRect={phase === "closing" ? closingOriginRect : originRect}
          viewportWidth={width}
          viewportHeight={height}
          videoRef={activeVideoRef}
          onClose={close}
          onNext={() => goTo(activeIndex + 1)}
          onPrevious={() => goTo(activeIndex - 1)}
          onDragStart={() => setDrag({ x: 0, y: 0, active: true, settling: false })}
          onDragMove={(x, y) => setDrag({ x, y, active: true, settling: false })}
          onDragCancel={() => setDrag({ x: 0, y: 0, active: false, settling: true })}
          onVideoError={onVideoError}
        />

        <div
          style={{
            ...styles.header,
            opacity: chromeOpacity,
            color: chromeColor,
            paddingTop: isCompact ? 12 : 22,
            paddingLeft: isCompact ? 14 : 24,
            paddingRight: isCompact ? 14 : 24,
          }}
        >
          <div style={styles.titleBlock}>
            {activeItem.title ? <div style={styles.title}>{activeItem.title}</div> : null}
            {activeItem.subtitle ? (
              <div style={{ ...styles.subtitle, color: subduedChromeColor }}>
                {activeItem.subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close media viewer"
            onClick={close}
            disabled={phase === "closing"}
            style={{ ...styles.iconButton, color: chromeColor }}
          >
            x
          </button>
        </div>

        {!isCompact && canGoPrevious ? (
          <button
            type="button"
            aria-label="Previous media item"
            onClick={() => goTo(activeIndex - 1)}
            disabled={phase !== "open"}
            style={{ ...styles.sideButton, ...styles.leftButton, color: chromeColor }}
          >
            {"<"}
          </button>
        ) : null}

        {!isCompact && canGoNext ? (
          <button
            type="button"
            aria-label="Next media item"
            onClick={() => goTo(activeIndex + 1)}
            disabled={phase !== "open"}
            style={{ ...styles.sideButton, ...styles.rightButton, color: chromeColor }}
          >
            {">"}
          </button>
        ) : null}

        {!config?.viewer?.hidePageIndicators ? (
          <div
            style={{
              ...styles.footer,
              opacity: chromeOpacity,
              color: chromeColor,
              paddingBottom: isCompact ? 16 : 24,
            }}
          >
            {activeItem.footer ? <div style={styles.footerText}>{activeItem.footer}</div> : null}
            <div style={styles.pagePills}>
              {items.map((item, index) => (
                <span
                  key={item.id}
                  style={{
                    ...styles.pagePill,
                    background: index === activeIndex ? chromeColor : "rgba(130,130,130,0.45)",
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

type WebMediaStageProps = {
  item: NativeMediaViewerItem;
  index: number;
  thumbnailKey: string;
  compact: boolean;
  phase: TransitionPhase;
  matchOriginRect: OriginRect;
  viewportWidth: number;
  viewportHeight: number;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragCancel: () => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
};

function WebMediaStage({
  item,
  index,
  thumbnailKey,
  compact,
  phase,
  matchOriginRect,
  viewportWidth,
  viewportHeight,
  videoRef,
  onClose,
  onNext,
  onPrevious,
  onDragStart,
  onDragMove,
  onDragCancel,
  onVideoError,
}: WebMediaStageProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mediaSize, setMediaSize] = useState<Size | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef({ x: 0, y: 0, active: false });
  const gesture = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    pinchDistance: 0,
    pinchZoom: 1,
  });
  const mediaUri = useWebMediaUri(item.uri, item.headers);
  const posterUri = useWebMediaUri(item.thumbnailUri, item.thumbnailHeaders);
  const isImage = item.type === "image";

  const resetTransform = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isImage && isVideoControlPointerEvent(event)) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size === 1) {
        gesture.current = {
          ...gesture.current,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: offset.x,
          offsetY: offset.y,
        };
      } else if (pointers.current.size === 2 && isImage) {
        const [first, second] = Array.from(pointers.current.values());
        gesture.current = {
          ...gesture.current,
          pinchDistance: distance(first, second),
          pinchZoom: zoom,
        };
      }
    },
    [isImage, offset.x, offset.y, zoom],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size >= 2 && isImage) {
        const [first, second] = Array.from(pointers.current.values());
        const nextDistance = distance(first, second);
        const startDistance = Math.max(1, gesture.current.pinchDistance);
        setZoom(clamp((gesture.current.pinchZoom * nextDistance) / startDistance, 1, 4));
        return;
      }

      const deltaX = event.clientX - gesture.current.startX;
      const deltaY = event.clientY - gesture.current.startY;

      if (isImage && zoom > 1) {
        setOffset({
          x: gesture.current.offsetX + deltaX,
          y: gesture.current.offsetY + deltaY,
        });
        return;
      }

      if (
        !dragRef.current.active &&
        distance({ x: 0, y: 0 }, { x: deltaX, y: deltaY }) < DRAG_ACTIVATION_DISTANCE
      ) {
        return;
      }

      if (!dragRef.current.active) {
        onDragStart();
      }
      dragRef.current = { x: deltaX, y: deltaY, active: true };
      onDragMove(deltaX, deltaY);
    },
    [isImage, onDragMove, onDragStart, zoom],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (pointers.current.size > 0) {
        const remainingPointer = Array.from(pointers.current.values())[0];
        if (remainingPointer) {
          gesture.current = {
            ...gesture.current,
            startX: remainingPointer.x,
            startY: remainingPointer.y,
            offsetX: offset.x,
            offsetY: offset.y,
            pinchDistance: 0,
            pinchZoom: zoom,
          };
        }
        if (dragRef.current.active) {
          dragRef.current = { x: 0, y: 0, active: false };
          onDragCancel();
        }
        return;
      }

      if (zoom > 1) {
        if (dragRef.current.active) {
          dragRef.current = { x: 0, y: 0, active: false };
          onDragCancel();
        }
        return;
      }

      const { x, y, active } = dragRef.current;
      dragRef.current = { x: 0, y: 0, active: false };

      if (!active) {
        return;
      }

      const absX = Math.abs(x);
      const absY = Math.abs(y);

      if (y > 90 && absY > absX) {
        onClose();
      } else if (absX > 80 && absX > absY) {
        if (x < 0) {
          onNext();
        } else {
          onPrevious();
        }
        onDragCancel();
      } else {
        onDragCancel();
      }
    },
    [offset.x, offset.y, onClose, onDragCancel, onNext, onPrevious, zoom],
  );

  const handleDoubleClick = useCallback(() => {
    if (!isImage) return;
    if (zoom > 1) {
      resetTransform();
      return;
    }
    setZoom(compact ? 2.4 : 2);
  }, [compact, isImage, resetTransform, zoom]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!isImage) return;
      setZoom((current) => clamp(current + (event.deltaY < 0 ? 0.18 : -0.18), 1, 4));
    },
    [isImage],
  );

  const zoomTransform = `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`;
  const matchTransform = toForegroundMatchTransform({
    phase,
    originRect: matchOriginRect,
    width: viewportWidth,
    height: viewportHeight,
    mediaSize,
  });
  const transform = phase === "open" ? zoomTransform : matchTransform;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This is a pointer gesture surface inside the modal dialog.
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      style={{
        ...styles.stage,
        cursor: zoom > 1 ? "grab" : "default",
        touchAction: "none",
      }}
    >
      <div
        style={{
          ...styles.mediaTransform,
          transform,
          transformOrigin: phase === "open" ? "center center" : "0 0",
          transition:
            pointers.current.size > 0
              ? "none"
              : `transform ${
                  phase === "open" ? 180 : MATCH_TRANSITION_MS
                }ms ${phase === "open" ? "ease" : MATCH_EASING}, opacity 180ms ease`,
        }}
      >
        {isImage ? (
          <img
            src={mediaUri}
            draggable={false}
            alt={item.title ?? `Media item ${index + 1}`}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                setMediaSize({ width: image.naturalWidth, height: image.naturalHeight });
              }
            }}
            style={styles.mediaElement}
          />
        ) : (
          // biome-ignore lint/a11y/useMediaCaption: Caption tracks are source data, not viewer chrome.
          <video
            ref={videoRef}
            src={mediaUri}
            poster={posterUri}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              if (event.currentTarget.videoWidth > 0 && event.currentTarget.videoHeight > 0) {
                setMediaSize({
                  width: event.currentTarget.videoWidth,
                  height: event.currentTarget.videoHeight,
                });
              }
              const startTime = getWebVideoThumbnailTime(thumbnailKey);
              if (startTime > 0) {
                event.currentTarget.currentTime = startTime;
              }
            }}
            onError={() => {
              onVideoError?.({
                nativeEvent: {
                  index,
                  url: item.uri,
                  message: "Unable to play web video.",
                  platform: "web",
                  stage: "remote",
                },
              } as MediaViewerVideoErrorEvent);
            }}
            style={styles.mediaElement}
          />
        )}
      </div>
    </div>
  );
}

function lockDocumentScroll() {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const html = document.documentElement;
  const body = document.body;
  const previous = {
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscrollBehavior: body.style.overscrollBehavior,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
  };

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = `-${scrollX}px`;
  body.style.right = "0";
  body.style.width = "100%";

  return () => {
    html.style.overflow = previous.htmlOverflow;
    html.style.overscrollBehavior = previous.htmlOverscrollBehavior;
    body.style.overflow = previous.bodyOverflow;
    body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
    body.style.position = previous.bodyPosition;
    body.style.top = previous.bodyTop;
    body.style.left = previous.bodyLeft;
    body.style.right = previous.bodyRight;
    body.style.width = previous.bodyWidth;
    window.scrollTo(scrollX, scrollY);
  };
}

function toThumbnailAccessibilityLabel(item: NativeMediaViewerItem, index: number) {
  const label = item.title ?? item.subtitle ?? item.type;
  return `Open ${label} ${index + 1}`;
}

function makeGroupId(itemsJson: string) {
  let hash = 0;
  for (let index = 0; index < itemsJson.length; index += 1) {
    hash = (hash * 31 + itemsJson.charCodeAt(index)) | 0;
  }
  return `media-viewer:${hash.toString(36)}`;
}

function distance(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isVideoControlPointerEvent(event: React.PointerEvent<HTMLDivElement>) {
  if (typeof HTMLVideoElement === "undefined" || !(event.target instanceof HTMLVideoElement)) {
    return false;
  }

  const rect = event.target.getBoundingClientRect();
  const controlHeight = Math.min(64, rect.height * 0.35);
  return event.clientY >= rect.bottom - controlHeight;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = {
  portalRoot: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    overflow: "hidden",
    touchAction: "none",
    overscrollBehavior: "none",
    pointerEvents: "auto",
  },
  stage: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaTransform: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    willChange: "transform, opacity",
  },
  mediaElement: {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    minHeight: 72,
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    pointerEvents: "none",
    transition: "opacity 180ms ease",
  },
  titleBlock: {
    minWidth: 0,
    maxWidth: "min(680px, 72vw)",
    textShadow: "0 1px 24px rgba(0,0,0,0.35)",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: "22px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: "18px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  iconButton: {
    pointerEvents: "auto",
    width: 44,
    height: 44,
    border: 0,
    borderRadius: 22,
    background: "rgba(110,110,110,0.24)",
    fontSize: 24,
    lineHeight: "44px",
    fontWeight: 500,
    cursor: "pointer",
  },
  sideButton: {
    position: "absolute",
    top: "50%",
    width: 52,
    height: 72,
    marginTop: -36,
    border: 0,
    borderRadius: 26,
    background: "rgba(110,110,110,0.18)",
    fontSize: 34,
    lineHeight: "72px",
    cursor: "pointer",
  },
  leftButton: {
    left: 24,
  },
  rightButton: {
    right: 24,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    pointerEvents: "none",
    transition: "opacity 180ms ease",
  },
  footerText: {
    fontSize: 13,
    fontWeight: 600,
    textShadow: "0 1px 18px rgba(0,0,0,0.35)",
  },
  pagePills: {
    display: "flex",
    flexDirection: "row",
    gap: 6,
    maxWidth: "80vw",
    overflow: "hidden",
  },
  pagePill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
} satisfies Record<string, React.CSSProperties>;

export { MediaViewer };
export default MediaViewer;
