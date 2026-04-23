import { Image } from "expo-image";
import { MediaViewer, type MediaViewerIndexChangedEvent } from "expo-media-viewer";
import { Stack } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { PlayOverlay } from "../src/components/PlayOverlay";
import { CIRCLE_SECTIONS, type MediaItem } from "../src/data/samples";
import { logMediaViewerVideoError } from "../src/utils/logMediaViewerVideoError";

const COLS = 3;
const GAP = 2;
const HEADER_H = 44;
const HEADER_M_TOP = 12;
const HEADER_M_BOTTOM = 4;

type FlatEntry = {
  url: string;
  poster?: string;
  type: "image" | "video";
  sectionIndex: number;
  itemIndex: number;
};

export default function Masonry() {
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(Math.floor(windowWidth));
  const cellSize = Math.floor((gridWidth - GAP * (COLS - 1)) / COLS);

  const { flat, tileYs } = useMemo(() => {
    const entries: FlatEntry[] = [];
    const ys: number[] = [];
    let y = 0;
    CIRCLE_SECTIONS.forEach((section, sectionIndex) => {
      y += HEADER_M_TOP + HEADER_H + HEADER_M_BOTTOM;
      section.items.forEach((item, itemIndex) => {
        entries.push({
          url: item.url,
          poster: item.poster,
          type: item.type,
          sectionIndex,
          itemIndex,
        });
        const row = Math.floor(itemIndex / COLS);
        ys.push(y + row * (cellSize + GAP));
      });
      const rows = Math.ceil(section.items.length / COLS);
      y += rows * cellSize + (rows - 1) * GAP;
    });
    return { flat: entries, tileYs: ys };
  }, [cellSize]);

  const { urls, mediaTypes, posterUrls, topTitles, topSubtitles, bottomTexts } = useMemo(() => {
    const total = flat.length;
    return {
      urls: flat.map((f) => f.url),
      mediaTypes: flat.map((f) => f.type),
      posterUrls: flat.map((f) => f.poster ?? ""),
      topTitles: flat.map(() => "Masonry screen"),
      topSubtitles: flat.map((f) => {
        const section = CIRCLE_SECTIONS[f.sectionIndex];
        return `${section.title} · ${f.itemIndex + 1}/${section.items.length}`;
      }),
      bottomTexts: flat.map((_, i) => `${i + 1} / ${total}`),
    };
  }, [flat]);

  const handleIndexChange = useCallback(
    (e: MediaViewerIndexChangedEvent) => {
      const i = e.nativeEvent.currentIndex;
      const y = tileYs[i];
      if (y == null) return;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 160), animated: false });
    },
    [tileYs],
  );
  const handleVideoError = useMemo(() => logMediaViewerVideoError("masonry"), []);

  return (
    <>
      <Stack.Screen options={{ title: "Masonry screen" }} />
      <MediaViewer
        urls={urls}
        theme="dark"
        mediaTypes={mediaTypes}
        posterUrls={posterUrls}
        topTitles={topTitles}
        topSubtitles={topSubtitles}
        bottomTexts={bottomTexts}
        onVideoError={handleVideoError}
      >
        <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
          <View
            onLayout={(event) => {
              const width = Math.floor(event.nativeEvent.layout.width);
              if (width > 0 && width !== gridWidth) {
                setGridWidth(width);
              }
            }}
          >
            {CIRCLE_SECTIONS.map((section, sectionIndex) => {
              const baseFlat = flat.findIndex((f) => f.sectionIndex === sectionIndex);
              return (
                <View key={section.id}>
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                  <View style={styles.grid}>
                    {chunkItems(section.items, COLS).map((row, rowIndex) => (
                      <View key={`${section.id}-${rowIndex}`} style={styles.gridRow}>
                        {row.map((item, columnIndex) => {
                          const itemIndex = rowIndex * COLS + columnIndex;
                          const flatIdx = baseFlat + itemIndex;
                          return (
                            <MediaViewer.Image
                              key={item.url}
                              index={flatIdx}
                              onIndexChange={handleIndexChange}
                              style={{ width: cellSize, height: cellSize }}
                            >
                              <Image
                                source={{ uri: thumbnailUrl(item) }}
                                style={{ width: cellSize, height: cellSize }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                recyclingKey={item.url}
                                transition={150}
                                priority="low"
                              />
                              {item.type === "video" && <PlayOverlay duration={item.duration} />}
                            </MediaViewer.Image>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </MediaViewer>
    </>
  );
}

function thumbnailUrl(item: MediaItem) {
  return item.poster ?? item.url;
}

function chunkItems<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { paddingBottom: 48 },
  sectionHeader: {
    color: "#e8e8e8",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    height: HEADER_H,
    lineHeight: HEADER_H,
    marginTop: HEADER_M_TOP,
    marginBottom: HEADER_M_BOTTOM,
    backgroundColor: "#0a0a0a",
  },
  grid: { gap: GAP },
  gridRow: { flexDirection: "row", gap: GAP },
});
