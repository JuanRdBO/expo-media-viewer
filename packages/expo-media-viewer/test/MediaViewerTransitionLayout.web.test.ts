import { describe, expect, test } from "bun:test";
import {
  dragProgressFrom,
  fitRectIntoBounds,
  makeFallbackOriginRect,
  toChromeOpacity,
  toClosedMatchFrame,
  toForegroundMatchTransform,
} from "../src/MediaViewerTransitionLayout.web";

describe("web transition layout", () => {
  test("centers fallback rects and keeps zero-size viewports stable", () => {
    expect(makeFallbackOriginRect(390, 844)).toEqual({
      x: 75,
      y: 302,
      width: 240,
      height: 240,
    });
    expect(makeFallbackOriginRect(0, 0)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

    const closedFrame = toClosedMatchFrame({ x: 0, y: 0, width: 0, height: 0 }, 0, 0);
    expect(closedFrame.transform).toBe("translate3d(0px, 0px, 0) scale(1)");
    expect(closedFrame.clipPath).not.toContain("NaN");
    expect(closedFrame.clipPath).not.toContain("Infinity");

    for (const value of Object.values(closedFrame.clipRect)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  test("fits wide and tall media into viewport bounds", () => {
    expect(fitRectIntoBounds({ width: 400, height: 200 }, { width: 100, height: 100 })).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
    expect(fitRectIntoBounds({ width: 100, height: 200 }, { width: 100, height: 100 })).toEqual({
      x: 25,
      y: 0,
      width: 50,
      height: 100,
    });
  });

  test("calculates drag progress and chrome opacity from viewport-relative movement", () => {
    const dragProgress = dragProgressFrom(
      { x: 100, y: -200, active: true, settling: false },
      400,
      800,
    );

    expect(dragProgress).toBeCloseTo(0.45);
    expect(toChromeOpacity("open", dragProgress)).toBeCloseTo(0.01);
    expect(toChromeOpacity("closing", dragProgress)).toBe(0);
  });

  test("matches foreground media to the thumbnail crop during open and close transitions", () => {
    expect(
      toForegroundMatchTransform({
        phase: "open",
        originRect: { x: 20, y: 30, width: 40, height: 20 },
        width: 100,
        height: 100,
        mediaSize: { width: 50, height: 100 },
      }),
    ).toBe("translate3d(0px, 0px, 0) scale(1)");

    expect(
      toForegroundMatchTransform({
        phase: "closing",
        originRect: { x: 20, y: 30, width: 40, height: 20 },
        width: 100,
        height: 100,
        mediaSize: { width: 50, height: 100 },
      }),
    ).toBe("translate3d(-50px, -50px, 0) scale(2)");
  });
});
