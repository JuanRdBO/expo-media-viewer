import { describe, expect, test } from "bun:test";
import {
  clampWebZoom,
  resolveWebDragReleaseAction,
  shouldActivateWebDrag,
} from "../src/MediaViewerWebGestures";

describe("MediaViewerWebGestures", () => {
  test("activates drag only after the movement threshold", () => {
    expect(shouldActivateWebDrag({ x: 3, y: 4 })).toBe(false);
    expect(shouldActivateWebDrag({ x: 6, y: 0 })).toBe(true);
    expect(shouldActivateWebDrag({ x: 0, y: -7 })).toBe(true);
  });

  test("maps vertical release to dismiss only when downward movement dominates", () => {
    expect(resolveWebDragReleaseAction({ x: 20, y: 91 })).toBe("close");
    expect(resolveWebDragReleaseAction({ x: 120, y: 100 })).toBe("previous");
    expect(resolveWebDragReleaseAction({ x: 0, y: -120 })).toBe("cancel");
  });

  test("maps horizontal release to paging by drag direction", () => {
    expect(resolveWebDragReleaseAction({ x: -81, y: 8 })).toBe("next");
    expect(resolveWebDragReleaseAction({ x: 81, y: 8 })).toBe("previous");
    expect(resolveWebDragReleaseAction({ x: 80, y: 0 })).toBe("cancel");
    expect(resolveWebDragReleaseAction({ x: 90, y: 100 })).toBe("close");
  });

  test("clamps zoom to the supported viewer range", () => {
    expect(clampWebZoom(0.2)).toBe(1);
    expect(clampWebZoom(2.5)).toBe(2.5);
    expect(clampWebZoom(8)).toBe(4);
  });
});
