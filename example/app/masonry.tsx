import {
  MediaViewer,
  type MediaViewerIndexChangedEvent,
  type MediaViewerItem,
  type MediaViewerRenderItem,
} from "expo-media-viewer";
import { router, Stack } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CIRCLE_SECTIONS } from "../src/data/samples";
import { logMediaViewerVideoError } from "../src/utils/logMediaViewerVideoError";

const COLS = 3;
const GAP = 2;
const HEADER_H = 44;
const HEADER_M_TOP = 12;
const HEADER_M_BOTTOM = 4;

type FlatEntry = {
  item: MediaViewerItem;
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
          item,
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

  const viewerItems = useMemo(() => {
    const total = flat.length;
    return flat.map(({ item, sectionIndex, itemIndex }, index) => {
      const section = CIRCLE_SECTIONS[sectionIndex];
      return {
        ...item,
        chrome: {
          title: "Masonry screen",
          subtitle: `${section.title} · ${itemIndex + 1}/${section.items.length}`,
          footer: `${index + 1} / ${total}`,
        },
      };
    });
  }, [flat]);

  const handleIndexChange = useCallback(
    (event: MediaViewerIndexChangedEvent) => {
      const index = event.nativeEvent.currentIndex;
      const y = tileYs[index];
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
        items={viewerItems}
        config={{
          theme: "dark",
          thumbnail: { videoMode: "loop-muted", fit: "cover" },
        }}
        onIndexChange={handleIndexChange}
        onVideoError={handleVideoError}
        renderLayout={({ renderItem }) => (
          <ScrollView
            ref={scrollRef}
            style={styles.container}
            contentContainerStyle={styles.content}
          >
            <ScreenHeader title="Masonry screen" />
            <View
              onLayout={(event) => {
                const width = Math.floor(event.nativeEvent.layout.width);
                if (width > 0 && width !== gridWidth) {
                  setGridWidth(width);
                }
              }}
            >
              {CIRCLE_SECTIONS.map((section, sectionIndex) => {
                const baseFlat = flat.findIndex((entry) => entry.sectionIndex === sectionIndex);
                return (
                  <View key={section.id}>
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                    <View style={styles.grid}>
                      {chunkItems(section.items, COLS).map((row, rowIndex) => (
                        <View key={`${section.id}-${rowIndex}`} style={styles.gridRow}>
                          {row.map((item, columnIndex) => {
                            const itemIndex = rowIndex * COLS + columnIndex;
                            const flatIndex = baseFlat + itemIndex;
                            return renderMasonryItem(renderItem, flatIndex, item, cellSize);
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      />
    </>
  );
}

function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      <Text style={styles.screenTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function renderMasonryItem(
  renderItem: MediaViewerRenderItem,
  index: number,
  _item: MediaViewerItem,
  cellSize: number,
) {
  return renderItem(index, {
    frame: { width: cellSize, height: cellSize },
  });
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
  content: { paddingTop: 12, paddingBottom: 48 },
  screenHeader: {
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { color: "#fff", fontSize: 34, lineHeight: 38 },
  screenTitle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "600", textAlign: "center" },
  headerSpacer: { width: 40 },
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
