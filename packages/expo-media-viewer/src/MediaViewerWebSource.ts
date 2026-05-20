import { useEffect, useMemo, useState } from "react";
import type { MediaViewerHeaders } from "./MediaViewer.types";

type StableHeaderEntries = [string, string][];
type WebMediaSourceListener = (url: string | undefined) => void;
type WebMediaSourceRequest = {
  uri: string | undefined;
  headers: MediaViewerHeaders | undefined;
};

type WebMediaSourceEntry = {
  controller: AbortController;
  listeners: Set<WebMediaSourceListener>;
  objectUrl: string | undefined;
};

type WebMediaSourceStoreOptions = {
  fetcher?: typeof fetch;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

type WebMediaSourceStore = {
  subscribe: (
    uri: string,
    headers: MediaViewerHeaders,
    listener: WebMediaSourceListener,
  ) => () => void;
  clear: () => void;
  getEntryCount: () => number;
};

export function useWebMediaUri(uri: string | undefined, headers: MediaViewerHeaders | undefined) {
  const cacheKey = getWebMediaSourceCacheKey(uri, headers);
  const request = useMemo(() => toWebMediaSourceRequest(cacheKey), [cacheKey]);
  const [resolvedUri, setResolvedUri] = useState<string | undefined>(() =>
    request.headers ? undefined : request.uri,
  );

  useEffect(() => {
    if (!request.uri) {
      setResolvedUri(undefined);
      return;
    }

    if (!request.headers) {
      setResolvedUri(request.uri);
      return;
    }

    setResolvedUri(undefined);
    return webMediaSourceStore.subscribe(request.uri, request.headers, setResolvedUri);
  }, [request]);

  return resolvedUri;
}

export function getWebMediaSourceCacheKey(
  uri: string | undefined,
  headers: MediaViewerHeaders | undefined,
) {
  if (!uri) return undefined;
  return JSON.stringify([uri, toStableHeaderEntries(headers)] satisfies [
    string,
    StableHeaderEntries,
  ]);
}

export function createWebMediaSourceStore(
  options: WebMediaSourceStoreOptions = {},
): WebMediaSourceStore {
  const entries = new Map<string, WebMediaSourceEntry>();
  const fetcher = options.fetcher ?? fetch;
  const createObjectURL =
    options.createObjectURL ??
    ((blob: Blob) => {
      return URL.createObjectURL(blob);
    });
  const revokeObjectURL =
    options.revokeObjectURL ??
    ((url: string) => {
      URL.revokeObjectURL(url);
    });

  const disposeEntry = (key: string, entry: WebMediaSourceEntry) => {
    entry.controller.abort();
    if (entry.objectUrl) {
      revokeObjectURL(entry.objectUrl);
    }
    entries.delete(key);
  };

  const notify = (entry: WebMediaSourceEntry, url: string | undefined) => {
    for (const listener of entry.listeners) {
      listener(url);
    }
  };

  const load = (key: string, uri: string, headers: MediaViewerHeaders) => {
    const controller = new AbortController();
    const entry: WebMediaSourceEntry = {
      controller,
      listeners: new Set(),
      objectUrl: undefined,
    };
    entries.set(key, entry);

    fetcher(uri, { headers, signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load media: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted || entries.get(key) !== entry) return;

        entry.objectUrl = createObjectURL(blob);
        notify(entry, entry.objectUrl);
      })
      .catch(() => {
        if (controller.signal.aborted || entries.get(key) !== entry) return;

        notify(entry, undefined);
      });

    return entry;
  };

  return {
    subscribe(uri, headers, listener) {
      const key = getWebMediaSourceCacheKey(uri, headers);
      if (!key) {
        listener(undefined);
        return () => {};
      }

      const entry = entries.get(key) ?? load(key, uri, headers);
      entry.listeners.add(listener);
      listener(entry.objectUrl);

      return () => {
        const currentEntry = entries.get(key);
        if (!currentEntry) return;

        currentEntry.listeners.delete(listener);
        if (currentEntry.listeners.size === 0) {
          disposeEntry(key, currentEntry);
        }
      };
    },
    clear() {
      for (const [key, entry] of entries) {
        disposeEntry(key, entry);
      }
    },
    getEntryCount() {
      return entries.size;
    },
  };
}

function toStableHeaderEntries(headers: MediaViewerHeaders | undefined) {
  if (!headers) return [];

  return Object.entries(headers).sort(([firstKey, firstValue], [secondKey, secondValue]) => {
    const keyOrder = firstKey.localeCompare(secondKey);
    return keyOrder === 0 ? firstValue.localeCompare(secondValue) : keyOrder;
  });
}

function toWebMediaSourceRequest(cacheKey: string | undefined): WebMediaSourceRequest {
  if (!cacheKey) {
    return { uri: undefined, headers: undefined };
  }

  const [uri, headerEntries] = JSON.parse(cacheKey) as [string, StableHeaderEntries];
  return {
    uri,
    headers: headerEntries.length > 0 ? Object.fromEntries(headerEntries) : undefined,
  };
}

const webMediaSourceStore = createWebMediaSourceStore();
