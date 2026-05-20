import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type DragState = Point & {
  active: boolean;
};

type GestureState = {
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  pinchDistance: number;
  pinchZoom: number;
};

type WebMediaGestureCallbacks = {
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragCancel: () => void;
};

type UseWebMediaGesturesOptions = WebMediaGestureCallbacks & {
  isImage: boolean;
  compact: boolean;
};

type ZoomUpdate = number | ((current: number) => number);

type WebMediaGestureHandlers = {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
};

export type WebDragReleaseAction = "close" | "next" | "previous" | "cancel";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const COMPACT_DOUBLE_CLICK_ZOOM = 2.4;
const REGULAR_DOUBLE_CLICK_ZOOM = 2;
const WHEEL_ZOOM_STEP = 0.18;
const DRAG_ACTIVATION_DISTANCE = 6;
const VERTICAL_DISMISS_DISTANCE = 90;
const HORIZONTAL_PAGE_DISTANCE = 80;
const EMPTY_POINT: Point = { x: 0, y: 0 };
const INACTIVE_DRAG: DragState = { x: 0, y: 0, active: false };

export function useWebMediaGestures({
  isImage,
  compact,
  onClose,
  onNext,
  onPrevious,
  onDragStart,
  onDragMove,
  onDragCancel,
}: UseWebMediaGesturesOptions) {
  const [zoom, setZoomState] = useState(MIN_ZOOM);
  const [offset, setOffsetState] = useState<Point>(EMPTY_POINT);
  const [isInteracting, setIsInteracting] = useState(false);
  const callbacksRef = useRef<WebMediaGestureCallbacks>({
    onClose,
    onNext,
    onPrevious,
    onDragStart,
    onDragMove,
    onDragCancel,
  });
  const pointers = useRef(new Map<number, Point>());
  const dragRef = useRef<DragState>(INACTIVE_DRAG);
  const gesture = useRef<GestureState>({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    pinchDistance: 0,
    pinchZoom: MIN_ZOOM,
  });
  const zoomRef = useRef(MIN_ZOOM);
  const offsetRef = useRef<Point>(EMPTY_POINT);
  const pendingDragMoveRef = useRef<Point | null>(null);
  const dragMoveFrameRef = useRef<number | null>(null);

  useEffect(() => {
    callbacksRef.current = {
      onClose,
      onNext,
      onPrevious,
      onDragStart,
      onDragMove,
      onDragCancel,
    };
  }, [onClose, onNext, onPrevious, onDragStart, onDragMove, onDragCancel]);

  const setZoom = useCallback((nextZoom: ZoomUpdate) => {
    const value = clampWebZoom(
      typeof nextZoom === "function" ? nextZoom(zoomRef.current) : nextZoom,
    );
    zoomRef.current = value;
    setZoomState(value);
  }, []);

  const setOffset = useCallback((nextOffset: Point) => {
    offsetRef.current = nextOffset;
    setOffsetState(nextOffset);
  }, []);

  const resetTransform = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset(EMPTY_POINT);
  }, [setOffset, setZoom]);

  const syncInteractionState = useCallback(() => {
    const nextIsInteracting = pointers.current.size > 0;
    setIsInteracting((current) => (current === nextIsInteracting ? current : nextIsInteracting));
  }, []);

  const cancelPendingDragMove = useCallback(() => {
    if (dragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(dragMoveFrameRef.current);
      dragMoveFrameRef.current = null;
    }
    pendingDragMoveRef.current = null;
  }, []);

  const flushPendingDragMove = useCallback(() => {
    if (dragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(dragMoveFrameRef.current);
      dragMoveFrameRef.current = null;
    }

    const nextDragMove = pendingDragMoveRef.current;
    pendingDragMoveRef.current = null;
    if (nextDragMove) {
      callbacksRef.current.onDragMove(nextDragMove.x, nextDragMove.y);
    }
  }, []);

  const scheduleDragMove = useCallback((x: number, y: number) => {
    pendingDragMoveRef.current = { x, y };

    if (dragMoveFrameRef.current !== null) {
      return;
    }

    dragMoveFrameRef.current = window.requestAnimationFrame(() => {
      dragMoveFrameRef.current = null;
      const nextDragMove = pendingDragMoveRef.current;
      pendingDragMoveRef.current = null;

      if (nextDragMove) {
        callbacksRef.current.onDragMove(nextDragMove.x, nextDragMove.y);
      }
    });
  }, []);

  const cancelDragInteraction = useCallback(() => {
    dragRef.current = INACTIVE_DRAG;
    cancelPendingDragMove();
    callbacksRef.current.onDragCancel();
  }, [cancelPendingDragMove]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isImage && isVideoControlPointerEvent(event)) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      syncInteractionState();

      if (pointers.current.size === 1) {
        gesture.current = {
          ...gesture.current,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: offsetRef.current.x,
          offsetY: offsetRef.current.y,
        };
      } else if (pointers.current.size === 2 && isImage) {
        const [first, second] = Array.from(pointers.current.values());
        gesture.current = {
          ...gesture.current,
          pinchDistance: distance(first, second),
          pinchZoom: zoomRef.current,
        };
      }
    },
    [isImage, syncInteractionState],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size >= 2 && isImage) {
        const [first, second] = Array.from(pointers.current.values());
        const nextDistance = distance(first, second);
        const startDistance = Math.max(1, gesture.current.pinchDistance);
        setZoom((gesture.current.pinchZoom * nextDistance) / startDistance);
        return;
      }

      const deltaX = event.clientX - gesture.current.startX;
      const deltaY = event.clientY - gesture.current.startY;

      if (isImage && zoomRef.current > MIN_ZOOM) {
        setOffset({
          x: gesture.current.offsetX + deltaX,
          y: gesture.current.offsetY + deltaY,
        });
        return;
      }

      if (!dragRef.current.active && !shouldActivateWebDrag({ x: deltaX, y: deltaY })) {
        return;
      }

      if (!dragRef.current.active) {
        callbacksRef.current.onDragStart();
      }

      dragRef.current = { x: deltaX, y: deltaY, active: true };
      scheduleDragMove(deltaX, deltaY);
    },
    [isImage, scheduleDragMove, setOffset, setZoom],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);
      syncInteractionState();

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
            offsetX: offsetRef.current.x,
            offsetY: offsetRef.current.y,
            pinchDistance: 0,
            pinchZoom: zoomRef.current,
          };
        }
        if (dragRef.current.active) {
          cancelDragInteraction();
        }
        return;
      }

      if (zoomRef.current > MIN_ZOOM) {
        if (dragRef.current.active) {
          cancelDragInteraction();
        }
        return;
      }

      const currentDrag = dragRef.current;
      dragRef.current = INACTIVE_DRAG;
      flushPendingDragMove();

      if (!currentDrag.active) {
        return;
      }

      const releaseAction = resolveWebDragReleaseAction(currentDrag);

      if (releaseAction === "close") {
        callbacksRef.current.onClose();
        return;
      }

      if (releaseAction === "next") {
        callbacksRef.current.onNext();
        callbacksRef.current.onDragCancel();
        return;
      }

      if (releaseAction === "previous") {
        callbacksRef.current.onPrevious();
        callbacksRef.current.onDragCancel();
        return;
      }

      callbacksRef.current.onDragCancel();
    },
    [cancelDragInteraction, flushPendingDragMove, syncInteractionState],
  );

  const handleDoubleClick = useCallback(() => {
    if (!isImage) return;
    if (zoomRef.current > MIN_ZOOM) {
      resetTransform();
      return;
    }
    setZoom(compact ? COMPACT_DOUBLE_CLICK_ZOOM : REGULAR_DOUBLE_CLICK_ZOOM);
  }, [compact, isImage, resetTransform, setZoom]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!isImage) return;
      setZoom((current) => current + (event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP));
    },
    [isImage, setZoom],
  );

  const handlers = useMemo<WebMediaGestureHandlers>(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onDoubleClick: handleDoubleClick,
      onWheel: handleWheel,
    }),
    [handleDoubleClick, handlePointerDown, handlePointerEnd, handlePointerMove, handleWheel],
  );

  useEffect(() => () => cancelPendingDragMove(), [cancelPendingDragMove]);

  return {
    zoom,
    offset,
    isInteracting,
    handlers,
  };
}

export function shouldActivateWebDrag(delta: Point, activationDistance = DRAG_ACTIVATION_DISTANCE) {
  return distance(EMPTY_POINT, delta) >= activationDistance;
}

export function resolveWebDragReleaseAction(drag: Point): WebDragReleaseAction {
  const absX = Math.abs(drag.x);
  const absY = Math.abs(drag.y);

  if (drag.y > VERTICAL_DISMISS_DISTANCE && absY > absX) {
    return "close";
  }

  if (absX > HORIZONTAL_PAGE_DISTANCE && absX > absY) {
    return drag.x < 0 ? "next" : "previous";
  }

  return "cancel";
}

export function clampWebZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function distance(first: Point, second: Point) {
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
