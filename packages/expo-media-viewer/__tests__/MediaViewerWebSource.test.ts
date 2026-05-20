import { describe, expect, test } from "bun:test";
import { createWebMediaSourceStore, getWebMediaSourceCacheKey } from "../src/MediaViewerWebSource";

describe("MediaViewerWebSource", () => {
  test("builds stable keys for equivalent header pairs", () => {
    const firstKey = getWebMediaSourceCacheKey("https://cdn.example.com/media.jpg", {
      Authorization: "Bearer token",
      "X-Media": "thumbnail",
    });
    const secondKey = getWebMediaSourceCacheKey("https://cdn.example.com/media.jpg", {
      "X-Media": "thumbnail",
      Authorization: "Bearer token",
    });

    expect(firstKey).toBe(secondKey);
    expect(firstKey).not.toBe(
      getWebMediaSourceCacheKey("https://cdn.example.com/media.jpg", {
        Authorization: "Bearer other",
        "X-Media": "thumbnail",
      }),
    );
  });

  test("de-dupes identical authenticated media requests", async () => {
    const requestedSignals: AbortSignal[] = [];
    const firstUpdates: (string | undefined)[] = [];
    const secondUpdates: (string | undefined)[] = [];
    const store = createWebMediaSourceStore({
      fetcher: async (_uri, init) => {
        if (init?.signal) {
          requestedSignals.push(init.signal);
        }
        return new Response("image-bytes", { status: 200 });
      },
      createObjectURL: () => "blob:shared-media",
      revokeObjectURL: () => {},
    });

    const releaseFirst = store.subscribe(
      "https://cdn.example.com/media.jpg",
      { Authorization: "Bearer token", "X-Media": "thumbnail" },
      (url) => firstUpdates.push(url),
    );
    const releaseSecond = store.subscribe(
      "https://cdn.example.com/media.jpg",
      { "X-Media": "thumbnail", Authorization: "Bearer token" },
      (url) => secondUpdates.push(url),
    );

    await waitForPromises();

    expect(requestedSignals).toHaveLength(1);
    expect(firstUpdates).toEqual([undefined, "blob:shared-media"]);
    expect(secondUpdates).toEqual([undefined, "blob:shared-media"]);

    releaseFirst();
    releaseSecond();
  });

  test("owns object URL lifetime until the last subscriber releases", async () => {
    const revokedUrls: string[] = [];
    const store = createWebMediaSourceStore({
      fetcher: async () => new Response("image-bytes", { status: 200 }),
      createObjectURL: () => "blob:owned-media",
      revokeObjectURL: (url) => revokedUrls.push(url),
    });

    const releaseFirst = store.subscribe(
      "https://cdn.example.com/media.jpg",
      { Authorization: "Bearer token" },
      () => {},
    );
    const releaseSecond = store.subscribe(
      "https://cdn.example.com/media.jpg",
      { Authorization: "Bearer token" },
      () => {},
    );

    await waitForPromises();

    releaseFirst();
    expect(revokedUrls).toEqual([]);

    releaseSecond();
    expect(revokedUrls).toEqual(["blob:owned-media"]);
    expect(store.getEntryCount()).toBe(0);
  });

  test("aborts stale pending requests when the final subscriber releases", () => {
    const requestedSignals: AbortSignal[] = [];
    const store = createWebMediaSourceStore({
      fetcher: (_uri, init) => {
        if (init?.signal) {
          requestedSignals.push(init.signal);
        }
        return new Promise<Response>(() => {});
      },
      createObjectURL: () => "blob:unreachable",
      revokeObjectURL: () => {},
    });

    const release = store.subscribe(
      "https://cdn.example.com/media.jpg",
      { Authorization: "Bearer token" },
      () => {},
    );

    release();

    expect(requestedSignals).toHaveLength(1);
    expect(requestedSignals[0]?.aborted).toBe(true);
    expect(store.getEntryCount()).toBe(0);
  });
});

async function waitForPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
